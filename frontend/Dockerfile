# Etapa 1: Build
FROM node:20-alpine AS build

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código fuente del frontend
COPY . .

# Recibir la variable de entorno durante la compilación de Docker
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Compilar la aplicación para producción
RUN npm run build

# Etapa 2: Producción
FROM nginx:alpine

# Copiar los archivos compilados de la etapa de compilación
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar la configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
