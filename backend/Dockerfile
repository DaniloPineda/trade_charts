# backend/Dockerfile

# 1. Usar una imagen base oficial de Python
FROM python:3.12-slim

# 2. Establecer variables de entorno recomendadas
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# 3. Establecer el directorio de trabajo dentro del contenedor
WORKDIR /app/backend

# 4. Instalar dependencias
# Copiamos solo el archivo de requerimientos primero para aprovechar el cache de Docker
RUN apt-get update && apt-get install -y netcat-openbsd

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copiar el resto del código de la aplicación
COPY . .

# 6. Exponer el puerto en el que correrá la aplicación
EXPOSE 8000