# Guía de Despliegue en Google Cloud Run

Esta guía detalla el paso a paso para subir el proyecto CESFAM (Backend FastAPI, Base de Datos PostgreSQL, y la pila de monitoreo con Prometheus y Grafana) a **Google Cloud Platform (GCP)** utilizando **Cloud Run** y **Cloud SQL**.

---

## 🏗️ Arquitectura de Producción en GCP

En un entorno local, Docker Compose levanta contenedores y comparte carpetas para guardar métricas y configuraciones. En Cloud Run (que es *stateless* y autoescalable), la arquitectura recomendada es la siguiente:

```mermaid
graph TD
    Client[Cliente / Navegador] -->|HTTPS| Frontend[Cloud Run: Frontend]
    Frontend -->|API Requests| Backend[Cloud Run: Backend FastAPI]
    Backend -->|Conexión Segura| DB[(Google Cloud SQL: Postgres)]
    
    subgraph Monitoreo Nativo GCP (Recomendado)
        Backend -->|Expone /metrics| GMP[Managed Service for Prometheus]
        GMP -->|Métricas Consolidadas| GCM[Google Cloud Monitoring]
        Grafana[Cloud Run: Grafana] -->|Lee métricas usando IAM| GCM
    end
```

---

## 🛠️ Requisitos Previos

1. Tener instalado el **Google Cloud SDK (gcloud CLI)** en tu computadora.
2. Haber iniciado sesión en tu cuenta de GCP:
   ```bash
   gcloud auth login
   ```
3. Configurar tu proyecto activo:
   ```bash
   gcloud config set project ID_DE_TU_PROYECTO
   ```
4. Habilitar las APIs necesarias en tu cuenta de Google Cloud:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     sqladmin.googleapis.com \
     artifactregistry.googleapis.com \
     monitoring.googleapis.com
   ```

---

## 1. Configurar la Base de Datos (Google Cloud SQL)

Dado que Cloud Run no puede almacenar la base de datos localmente debido a su naturaleza volátil, debes crear una instancia de PostgreSQL en Cloud SQL.

1. **Crear la instancia de base de datos:**
   ```bash
   gcloud sql instances create cesfam-db \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1
   ```

2. **Crear el usuario y la base de datos:**
   ```bash
   gcloud sql databases create cesfam --instance=cesfam-db
   gcloud sql users create cesfam_user --instance=cesfam-db --password=tu_contraseña_segura
   ```

---

## 2. Compilar y Desplegar el Backend (FastAPI)

1. **Crear un registro de imágenes en Artifact Registry:**
   ```bash
   gcloud artifacts repositories create cesfam-repo \
     --repository-format=docker \
     --location=us-central1 \
     --description="Repositorio Docker para CESFAM"
   ```

2. **Compilar y subir la imagen del backend:**
   Desde la carpeta raíz del proyecto (donde está el archivo `backend/Dockerfile`):
   ```bash
   gcloud builds submit --tag us-central1-docker.pkg.dev/ID_DE_TU_PROYECTO/cesfam-repo/backend:latest ./backend
   ```

3. **Desplegar el Backend en Cloud Run:**
   Conecta el backend a Cloud SQL pasándole la cadena de conexión por variables de entorno:
   ```bash
    gcloud run deploy cesfam-backend \
      --image=us-central1-docker.pkg.dev/ID_DE_TU_PROYECTO/cesfam-repo/backend:latest \
      --region=us-central1 \
      --allow-unauthenticated \
      --add-cloudsql-instances=ID_DE_TU_PROYECTO:us-central1:cesfam-db \
      --set-env-vars="DATABASE_URL=postgresql://cesfam_user:tu_contraseña_segura@/cesfam?host=/cloudsql/ID_DE_TU_PROYECTO:us-central1:cesfam-db" \
      --min-instances=2 \
      --max-instances=10 \
      --port=8000
   ```
   *Guarda la URL que te entregue este comando (ej. `https://cesfam-backend-xxxx.run.app`). La usaremos para configurar el Frontend.*

---

## 3. Configurar el Monitoreo en GCP

Tienes dos opciones para desplegar Prometheus y Grafana en Cloud Run.

### Opción A: Usar Google Cloud Managed Service for Prometheus (GMP) [RECOMENDADO]
Esta opción es la más limpia y profesional. Evita tener que desplegar y administrar tu propio contenedor de Prometheus.

1. El backend ya está exponiendo `/metrics` de forma pública o interna.
2. **Habilitar la recolección automática de Prometheus en Cloud Run:**
   Google Cloud recopila automáticamente las métricas expuestas en `/metrics` si agregas el agente de telemetría a tu servicio. En la consola de Cloud Run, edita la configuración del servicio `cesfam-backend` y en la pestaña de **Integraciones**, añade "Cloud Monitoring" habilitando el raspado de Prometheus.
3. **Desplegar Grafana en Cloud Run:**
   - Sube la imagen oficial de Grafana al Artifact Registry.
   - Crea un bucket en Cloud Storage para persistir los dashboards de Grafana (de lo contrario se borrarán al reiniciar el contenedor):
     ```bash
     gsutil mb -l us-central1 gs://cesfam-grafana-data/
     ```
   - Despliega Grafana montando el bucket mediante **Cloud Storage FUSE**:
     ```bash
     gcloud run deploy cesfam-grafana \
       --image=grafana/grafana:10.0.3 \
       --region=us-central1 \
       --allow-unauthenticated \
       --port=3000 \
       --add-volume=name=grafana-storage,type=cloud-storage,bucket=cesfam-grafana-data \
       --add-volume-mount=volume=grafana-storage,mount-path=/var/lib/grafana \
       --set-env-vars="GF_SECURITY_ADMIN_PASSWORD=admin,GF_USERS_ALLOW_SIGN_UP=false"
     ```
   - Abre la URL de Grafana, inicia sesión con `admin`/`admin` y añade la fuente de datos **Google Cloud Monitoring** (que lee los datos consolidados automáticamente desde la infraestructura de Google).

---

### Opción B: Desplegar Prometheus y Grafana Propios (Autogestionados)
Si necesitas usar exactamente los contenedores configurados en este repositorio:

1. **Crear los Buckets de persistencia de datos:**
   ```bash
   gsutil mb -l us-central1 gs://cesfam-prometheus-storage/
   gsutil mb -l us-central1 gs://cesfam-grafana-storage/
   ```

2. **Crear y subir las imágenes de configuración:**
   Debes empaquetar tus archivos de configuración local (`prometheus.yml` y las carpetas de provisioning de Grafana) en imágenes Docker para que Cloud Run pueda cargarlas.
   
   - **Para Prometheus:** Crea un Dockerfile simple en `/monitoring/prometheus`:
     ```dockerfile
     FROM prom/prometheus:v2.45.0
     COPY prometheus.yml /etc/prometheus/prometheus.yml
     ```
     Súbelo y despliégalo:
     ```bash
     gcloud builds submit --tag us-central1-docker.pkg.dev/ID_DE_TU_PROYECTO/cesfam-repo/prometheus:latest ./monitoring/prometheus
     
     gcloud run deploy cesfam-prometheus \
       --image=us-central1-docker.pkg.dev/ID_DE_TU_PROYECTO/cesfam-repo/prometheus:latest \
       --region=us-central1 \
       --allow-unauthenticated \
       --port=9090 \
       --add-volume=name=prom-storage,type=cloud-storage,bucket=cesfam-prometheus-storage \
       --add-volume-mount=volume=prom-storage,mount-path=/prometheus
     ```
     *Nota: En tu `prometheus.yml` de producción, debes cambiar el target de `backend:8000` a la URL HTTPS de tu backend desplegado en Cloud Run (ej. `cesfam-backend-xxxx.run.app:443`).*

   - **Para Grafana:** Sube la configuración de dashboards locales y despliega con persistencia:
     ```bash
     # Compila la imagen con los dashboards preconfigurados
     gcloud builds submit --tag us-central1-docker.pkg.dev/ID_DE_TU_PROYECTO/cesfam-repo/grafana:latest ./monitoring/grafana
     
     gcloud run deploy cesfam-grafana \
       --image=us-central1-docker.pkg.dev/ID_DE_TU_PROYECTO/cesfam-repo/grafana:latest \
       --region=us-central1 \
       --allow-unauthenticated \
       --port=3000 \
       --add-volume=name=grafana-storage,type=cloud-storage,bucket=cesfam-grafana-storage \
       --add-volume-mount=volume=grafana-storage,mount-path=/var/lib/grafana \
       --set-env-vars="GF_SECURITY_ALLOW_EMBEDDING=true,GF_ANONYMOUS_ENABLED=true,GF_ANONYMOUS_ORG_ROLE=Admin"
     ```

---

## 4. Compilar y Desplegar el Frontend (React)

1. **Configurar la URL del backend:**
   Asegúrate de que las peticiones del frontend apunten a la URL de Cloud Run del backend (`https://cesfam-backend-xxxx.run.app`) en lugar de `localhost`.
   
2. **Compilar y subir la imagen del frontend:**
   Desde la carpeta raíz del proyecto:
   ```bash
   gcloud builds submit --tag us-central1-docker.pkg.dev/ID_DE_TU_PROYECTO/cesfam-repo/frontend:latest ./frontend
   ```

3. **Desplegar el Frontend en Cloud Run:**
   ```bash
   gcloud run deploy cesfam-frontend \
     --image=us-central1-docker.pkg.dev/ID_DE_TU_PROYECTO/cesfam-repo/frontend:latest \
     --region=us-central1 \
     --allow-unauthenticated \
     --port=80
   ```

---

## 🪣 5. Uso de Google Cloud Storage (Buckets) para Almacenamiento de Archivos

Para persistir archivos adjuntos (como la evidencia cargada en las órdenes de logística) de forma escalable y segura, se recomienda usar **Google Cloud Storage (GCS)** en lugar del almacenamiento efímero del contenedor de Cloud Run.

Existen dos alternativas principales para esto:

### Alternativa A: Integración por Código utilizando la API de Google Cloud Storage (Recomendada)

Esta alternativa es ideal porque permite que la aplicación suba los archivos directamente al Bucket usando la SDK oficial de Google Cloud en Python.

#### 1. Agregar dependencias en el backend:
Agrega `google-cloud-storage` en tu archivo `backend/requirements.txt`:
```txt
google-cloud-storage>=2.10.0
```

#### 2. Crear el Bucket en Google Cloud Storage:
```bash
# Crear el bucket de almacenamiento (nombre único global)
gcloud storage buckets create gs://nombre-unico-cesfam-archivos --location=us-central1
```

#### 3. Implementar el código en tu backend (FastAPI):
Configura la subida en las rutas correspondientes (como al recibir la evidencia en `api_citas.py`):
```python
import os
from google.cloud import storage

# Nombre del bucket obtenido por variable de entorno
BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "nombre-unico-cesfam-archivos")

def subir_a_bucket(file_content: bytes, destination_blob_name: str, content_type: str):
    """Sube un archivo directamente a un bucket de Google Cloud Storage."""
    # El cliente se autentica automáticamente si corre dentro de Cloud Run
    # utilizando las credenciales del Service Account asignado.
    storage_client = storage.Client()
    bucket = storage_client.bucket(BUCKET_NAME)
    blob = bucket.blob(destination_blob_name)
    
    # Subir el archivo
    blob.upload_from_string(file_content, content_type=content_type)
    
    # Retornar la URL pública u orientada a autenticación
    return blob.public_url
```

---

### Alternativa B: Montaje de Cloud Storage como Volumen FUSE en Cloud Run

Si prefieres no modificar el código y hacer que tu backend crea que está guardando archivos en un directorio local ordinario, puedes montar tu Bucket directamente en un path de almacenamiento en Cloud Run utilizando **Cloud Storage FUSE**.

#### 1. Crear el bucket en Google Cloud Storage:
```bash
gcloud storage buckets create gs://cesfam-archivos-locales --location=us-central1
```

#### 2. Desplegar el Backend indicando el montaje del volumen:
Cuando despliegues tu backend en Cloud Run, añade los parámetros `--add-volume` y `--add-volume-mount`:
```bash
gcloud run deploy cesfam-backend \
  --image=us-central1-docker.pkg.dev/ID_DE_TU_PROYECTO/cesfam-repo/backend:latest \
  --region=us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances=ID_DE_TU_PROYECTO:us-central1:cesfam-db \
  --set-env-vars="DATABASE_URL=postgresql://cesfam_user:tu_contraseña_segura@/cesfam?host=/cloudsql/ID_DE_TU_PROYECTO:us-central1:cesfam-db" \
  --add-volume=name=storage-volume,type=cloud-storage,bucket=cesfam-archivos-locales \
  --add-volume-mount=volume=storage-volume,mount-path=/usr/src/app/uploads \
  --port=8000
```
Cualquier archivo que el backend guarde dentro de `/usr/src/app/uploads` se sincronizará automáticamente y se persistirá de forma segura en tu bucket de Google Cloud Storage.

---

## 🔐 6. Seguridad e IAM (Cuentas de Servicio)

Para que tu contenedor de Cloud Run tenga permisos de leer/escribir en tu base de datos de Cloud SQL y en tu Bucket de Cloud Storage sin guardar contraseñas ni archivos JSON de credenciales en tu código, debes usar una **Cuenta de Servicio**.

1. **Crear una Cuenta de Servicio dedicada:**
   ```bash
   gcloud iam service-accounts create cesfam-runner \
     --description="Cuenta de servicio para ejecutar contenedores de CESFAM en Cloud Run" \
     --display-name="cesfam-runner"
   ```

2. **Otorgar los roles necesarios:**
   - **Acceso a la base de datos (Cloud SQL Client):**
     ```bash
     gcloud projects add-iam-policy-binding ID_DE_TU_PROYECTO \
       --member="serviceAccount:cesfam-runner@ID_DE_TU_PROYECTO.iam.gserviceaccount.com" \
       --role="roles/cloudsql.client"
     ```
   - **Acceso al Bucket de Storage (Storage Object Admin):**
     ```bash
     gcloud projects add-iam-policy-binding ID_DE_TU_PROYECTO \
       --member="serviceAccount:cesfam-runner@ID_DE_TU_PROYECTO.iam.gserviceaccount.com" \
       --role="roles/storage.objectAdmin"
     ```

3. **Desplegar Cloud Run especificando la cuenta de servicio:**
   Al desplegar tu Backend o tu Grafana, agrega el parámetro `--service-account`:
   ```bash
    gcloud run deploy cesfam-backend \
      --image=us-central1-docker.pkg.dev/ID_DE_TU_PROYECTO/cesfam-repo/backend:latest \
      --service-account=cesfam-runner@ID_DE_TU_PROYECTO.iam.gserviceaccount.com \
      --region=us-central1 \
      --allow-unauthenticated \
      --add-cloudsql-instances=ID_DE_TU_PROYECTO:us-central1:cesfam-db \
      --set-env-vars="DATABASE_URL=postgresql://cesfam_user:tu_contraseña_segura@/cesfam?host=/cloudsql/ID_DE_TU_PROYECTO:us-central1:cesfam-db" \
      --min-instances=2 \
      --max-instances=10 \
      --port=8000
   ```

    ```

---

## 🏛️ 7. Justificación de Microservicios (3 Componentes)

Para cumplir con la arquitectura orientada a microservicios, el sistema se divide en **3 componentes claramente diferenciados e independientes**:

1. **Frontend (Capa de Presentación)**: Aplicación SPA React empaquetada en un contenedor Docker con Nginx. Corre en un servicio de Cloud Run independiente expuesto al público. Su responsabilidad es servir la UI al cliente.
2. **Backend (Capa de Negocio y API)**: Servicio FastAPI Python que maneja la lógica de negocio, consultas de citas, chatbot de IA e interacción con la base de datos PostgreSQL. Corre en otro servicio independiente de Cloud Run.
3. **Monitoreo (Capa de Observabilidad - Grafana)**: Servicio independiente de Grafana que consume métricas del backend a través de Prometheus y Google Cloud Monitoring, permitiendo al administrador auditar el rendimiento y telemetría de la web sin sobrecargar la API de negocio.

---

## ⚡ 8. Alta Disponibilidad y Resiliencia en Cloud Run

El diseño arquitectónico implementado en GCP garantiza alta disponibilidad y resiliencia:
* **Múltiples Instancias y Balanceo**: Configurado con `--min-instances=2` (dos réplicas calientes activas en todo momento) y escalabilidad automática hasta `--max-instances=10`. GCP maneja de forma nativa la distribución de carga y el balanceo HTTPS.
* **Recuperación Automática**: Cloud Run monitorea la salud del contenedor. Si un contenedor falla, es destruido y reemplazado por uno nuevo automáticamente sin interrupción de servicio.
* **Persistencia Desacoplada**: La base de datos corre en **Cloud SQL** (gestionado con backups automáticos y alta disponibilidad de GCP) y los archivos en **Google Cloud Storage (Buckets)**, eliminando la pérdida de datos cuando los contenedores escalan a cero o se reinician.

---

## 💾 9. Sistema de Respaldos (Backup y Restore)

Para cumplir con el requisito obligatorio de sistema de respaldos:

### A. Respaldos y Restauración de la Base de Datos (Cloud SQL)

1. **Crear un respaldo manual bajo demanda:**
   ```bash
   gcloud sql backups create --instance=cesfam-db
   ```
2. **Listar los respaldos disponibles (para obtener el ID de respaldo):**
   ```bash
   gcloud sql backups list --instance=cesfam-db
   ```
3. **Restaurar la base de datos a partir de un respaldo:**
   Reemplaza `ID_DEL_RESPALDO` con el valor obtenido del comando anterior:
   ```bash
   gcloud sql backups restore ID_DEL_RESPALDO \
     --restore-instance=cesfam-db \
     --backup-instance=cesfam-db
   ```

### B. Respaldos y Restauración de Archivos (Cloud Storage Buckets)

1. **Crear un Bucket de respaldo:**
   ```bash
   gcloud storage buckets create gs://nombre-unico-cesfam-archivos-backup --location=us-central1
   ```
2. **Ejecutar el Respaldo (copiar todo el contenido del bucket principal al de respaldo):**
   ```bash
   gcloud storage cp -r gs://nombre-unico-cesfam-archivos/* gs://nombre-unico-cesfam-archivos-backup/
   ```
3. **Restaurar los archivos (en caso de pérdida o corrupción):**
   ```bash
   gcloud storage cp -r gs://nombre-unico-cesfam-archivos-backup/* gs://nombre-unico-cesfam-archivos/
   ```

---

¡Felicidades! Tu aplicación completa, base de datos y entorno de monitoreo con métricas en tiempo real ahora están corriendo de forma escalable, segura y resiliente en Google Cloud.
