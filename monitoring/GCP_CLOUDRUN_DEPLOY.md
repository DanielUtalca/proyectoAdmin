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

¡Felicidades! Tu aplicación completa, base de datos y entorno de monitoreo con métricas en tiempo real ahora están corriendo de forma escalable y robusta en Google Cloud Run.
