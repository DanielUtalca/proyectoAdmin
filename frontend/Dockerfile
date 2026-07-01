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

# Compilar la aplicación para producción
RUN npm run build

# Etapa 2: Producción
FROM nginx:alpine

# Copiar los archivos compilados de la etapa de compilación
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar la configuración personalizada de Nginx
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

# Cambiar permisos de los directorios de Nginx para poder ejecutar sin root
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /usr/share/nginx/html
RUN touch /var/run/nginx.pid && chown -R nginx:nginx /var/run/nginx.pid

# Exponer el puerto 8080 para Cloud Run
EXPOSE 8080

# Cambiar al usuario no root
USER nginx

# Iniciar Nginx
CMD ["nginx", "-g", "daemon off;"]
