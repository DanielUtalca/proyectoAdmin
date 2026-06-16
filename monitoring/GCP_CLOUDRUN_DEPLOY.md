# 🚀 Guía Definitiva: Desplegar CESFAM en Google Cloud Shell

> [!IMPORTANT]
> Esta guía utiliza el ID de proyecto real: **`proyecto-cesfam-499520`**.
> Asegúrate de ejecutar los comandos directamente en **Google Cloud Shell**.

---

## 🔧 PASO 1: Configurar el Proyecto y habilitar APIs

Abre Cloud Shell y ejecuta:

```bash
# 1.1 - Configurar el proyecto activo
gcloud config set project proyecto-cesfam-499520

# 1.2 - Habilitar las APIs de Google Cloud necesarias
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  monitoring.googleapis.com \
  secretmanager.googleapis.com
```

---

## 📥 PASO 2: Clonar y Descargar el Código

```bash
# 2.1 - Descargar el código desde el repositorio de GitHub
cd ~
git clone https://github.com/DanielUtalca/proyectoAdmin.git
cd proyectoAdmin
```

---

## 🗄️ PASO 3: Crear la Base de Datos en Cloud SQL

```bash
# 3.1 - Crear la instancia de PostgreSQL (tarda ~5 minutos)
gcloud sql instances create cesfam-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=capideus

# 3.2 - Crear la base de datos "cesfam"
gcloud sql databases create cesfam --instance=cesfam-db

# 3.3 - Crear el usuario "cesfam_user"
gcloud sql users create cesfam_user \
  --instance=cesfam-db \
  --password=capideus

# 3.4 - Importar las tablas iniciales (init.sql)
# Crear bucket temporal para la importación
gsutil mb -l us-central1 gs://proyecto-cesfam-sql-init-499520/ 2>/dev/null || true
gsutil cp database/init.sql gs://proyecto-cesfam-sql-init-499520/init.sql

# Dar permisos a la base de datos para leer el bucket
SA_EMAIL=$(gcloud sql instances describe cesfam-db --format="value(serviceAccountEmailAddress)")
gsutil iam ch serviceAccount:${SA_EMAIL}:objectViewer gs://proyecto-cesfam-sql-init-499520/

# Ejecutar la importación del archivo SQL
gcloud sql import sql cesfam-db gs://proyecto-cesfam-sql-init-499520/init.sql \
  --database=cesfam \
  --user=cesfam_user \
  --quiet
```

---

## 📦 PASO 4: Crear el Repositorio de Imágenes Docker

```bash
# 4.1 - Crear el repositorio en Artifact Registry
gcloud artifacts repositories create cesfam-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Repositorio Docker para CESFAM"

# 4.2 - Autenticar Docker
gcloud auth configure-docker us-central1-docker.pkg.dev --quiet
```

---

## 🔙 PASO 5: Compilar y Desplegar el Backend (FastAPI)

```bash
# 5.1 - Subir y compilar la imagen del backend
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/proyecto-cesfam-499520/cesfam-repo/backend:latest \
  ./backend

# 5.2 - Desplegar el backend en Cloud Run
gcloud run deploy cesfam-backend \
  --image=us-central1-docker.pkg.dev/proyecto-cesfam-499520/cesfam-repo/backend:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --add-cloudsql-instances=proyecto-cesfam-499520:us-central1:cesfam-db \
  --set-env-vars="INSTANCE_CONNECTION_NAME=proyecto-cesfam-499520:us-central1:cesfam-db,DB_USER=cesfam_user,DB_PASS=capideus,DB_NAME=cesfam,GEMINI_MODEL=gemini-2.5-flash" \
  --min-instances=0 \
  --max-instances=3 \
  --port=8000 \
  --memory=512Mi \
  --quiet
```

---

## 📈 PASO 6: Compilar y Desplegar Prometheus (Servidor de Métricas)

Para que Grafana tenga datos que mostrar, necesitas levantar un recolector de métricas **Prometheus** en Cloud Run que lea el endpoint `/metrics` de tu backend:

```bash
# 6.1 - Compilar la imagen de Prometheus en el repositorio de la nube
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/proyecto-cesfam-499520/cesfam-repo/prometheus:latest \
  --file=monitoring/prometheus/Dockerfile.prod \
  ./monitoring/prometheus

# 6.2 - Desplegar Prometheus en Cloud Run (Puerto 9090)
gcloud run deploy cesfam-prometheus \
  --image=us-central1-docker.pkg.dev/proyecto-cesfam-499520/cesfam-repo/prometheus:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=9090 \
  --memory=256Mi \
  --quiet
```
*Guarda la URL del servicio `cesfam-prometheus` que te devuelva este comando para usarla en el datasource de Grafana.*

---

## 📊 PASO 7: Desplegar Grafana para Monitoreo

```bash
# 7.1 - Desplegar la imagen de Grafana en Cloud Run (Puerto 3000)
gcloud run deploy cesfam-grafana \
  --image=grafana/grafana:10.0.3 \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --memory=256Mi \
  --set-env-vars="GF_SECURITY_ADMIN_PASSWORD=admin,GF_USERS_ALLOW_SIGN_UP=false,GF_SECURITY_ALLOW_EMBEDDING=true,GF_ANONYMOUS_ENABLED=true,GF_ANONYMOUS_ORG_ROLE=Admin,GF_SECURITY_COOKIE_SECURE=true,GF_SECURITY_COOKIE_SAMESITE=none" \
  --min-instances=0 \
  --max-instances=1 \
  --quiet
```

### 📋 Configuración Inicial del Datasource en Grafana:
1. Abre tu panel de Grafana: `https://cesfam-grafana-271357973400.us-central1.run.app` e inicia sesión.
2. Ve a **Menu ☰** -> **Connections** -> **Data sources** -> **Add data source**.
3. Selecciona **Prometheus**.
4. En **Connection** -> **Prometheus server URL**, ingresa la URL de tu servicio `cesfam-prometheus` (ej. `https://cesfam-prometheus-xxxx.run.app`).
5. Baja al final de la página y haz clic en **Save & test**. Una vez verificado, tu panel importado ya tendrá datos reales.

---

## 🖥️ PASO 8: Compilar y Desplegar el Frontend (React)

> [!NOTE]
> El frontend ya contiene configurado el archivo `frontend/.env.production` con las URLs correctas de producción de tu backend y Grafana. El `Dockerfile` se encargará de realizar el build automáticamente usando esa configuración.

```bash
# 8.1 - Compilar la imagen del frontend
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/proyecto-cesfam-499520/cesfam-repo/frontend:latest \
  ./frontend

# 8.2 - Desplegar el frontend en Cloud Run
gcloud run deploy cesfam-frontend \
  --image=us-central1-docker.pkg.dev/proyecto-cesfam-499520/cesfam-repo/frontend:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=256Mi \
  --min-instances=0 \
  --max-instances=3 \
  --quiet
```

---

## 👥 PASO 9: Configurar Réplicas (Escalado y Alta Disponibilidad)

### 9.1 - Réplicas de la Aplicación (Escalado Horizontal de Cloud Run)
Para ajustar cuántos contenedores idénticos (réplicas) pueden levantarse para atender a los usuarios de forma simultánea cuando hay picos de tráfico:

```bash
# Modificar el backend para tener entre 1 y 5 réplicas activas
gcloud run services update cesfam-backend \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=5 \
  --quiet

# Modificar el frontend para tener entre 1 y 5 réplicas activas
gcloud run services update cesfam-frontend \
  --region=us-central1 \
  --min-instances=1 \
  --max-instances=5 \
  --quiet
```
*(Nota: Poner `min-instances=1` evita el 'cold start', es decir, que la página tarde en cargar la primera vez, pero recuerda que mantendrá una instancia cobrando de forma continua).*

### 9.2 - Réplicas de Lectura de la Base de Datos (Cloud SQL)
Para crear una base de datos secundaria que replique en tiempo real a la principal (`cesfam-db`), permitiendo derivar las consultas de lectura a ella y balancear la carga:

```bash
# A. Habilitar backups automáticos y Point-In-Time Recovery en la BD principal (Requisito Obligatorio)
gcloud sql instances patch cesfam-db \
  --backup-start-time=02:00 \
  --enable-point-in-time-recovery

# B. Crear la réplica de lectura (cesfam-db-replica) asociada a la principal
gcloud sql instances create cesfam-db-replica \
  --master-instance-name=cesfam-db \
  --tier=db-f1-micro \
  --region=us-central1
```

---

## 🛑 PASO 10: Pausar y Reanudar la aplicación (Para no gastar créditos)

Para evitar el consumo de tu cuota de créditos de GCP cuando no estés usando la aplicación:

### Pausar la Base de Datos (Deja de cobrar):
```bash
gcloud sql instances patch cesfam-db --activation-policy=NEVER
```

### Encender la Base de Datos (Cuando vayas a usarla):
```bash
gcloud sql instances patch cesfam-db --activation-policy=ALWAYS
```
*(Los servicios de Cloud Run se apagan solos a $0 de costo cuando nadie está interactuando con ellos).*
