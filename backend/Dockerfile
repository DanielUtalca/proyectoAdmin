# Usar la imagen oficial de Node.js basada en Alpine
FROM node:20-alpine

# Establecer el directorio de trabajo
WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias esenciales de producción
RUN npm install --only=production

# Copiar el código fuente
COPY . .

# Exponer el puerto de la API
EXPOSE 8000

# Iniciar la aplicación
CMD ["npm", "start"]
