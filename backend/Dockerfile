# Usar la imagen oficial de Python slim
FROM python:3.11-slim

# Evitar que Python escriba archivos .pyc en el disco
ENV PYTHONDONTWRITEBYTECODE 1
# Evitar que Python almacene en búfer stdout y stderr
ENV PYTHONUNBUFFERED 1

# Establecer el directorio de trabajo
WORKDIR /usr/src/app

# Copiar archivo de dependencias e instalar
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente
COPY . .

# Exponer el puerto de la API
EXPOSE 8000

# Iniciar la aplicación usando Uvicorn
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
