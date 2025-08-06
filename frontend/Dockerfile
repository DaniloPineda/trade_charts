# frontend/Dockerfile

# 1. Usar una imagen base oficial de Node.js
FROM node:20-alpine

# 2. Establecer el directorio de trabajo
WORKDIR /app/frontend

# 3. Copiar package.json y package-lock.json para instalar dependencias
# Esto aprovecha el cache de Docker si no cambian las dependencias
COPY package*.json ./
RUN npm install

# 4. Copiar el resto del código del frontend
COPY . .

# 5. Exponer el puerto del servidor de desarrollo de React
EXPOSE 3000

# 6. El comando para iniciar la aplicación
CMD ["npm", "start"]