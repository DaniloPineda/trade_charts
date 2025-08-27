# backend/Dockerfile (Versión Optimizada)

# 1. Usar una imagen base oficial de Python
FROM python:3.12-slim

# 2. Establecer variables de entorno
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV LANG es_ES.UTF-8

# 3. Instalar dependencias del sistema y configurar el locale en una sola capa
RUN apt-get update && \
    apt-get install -y locales netcat-openbsd && \
    sed -i -e 's/# es_ES.UTF-8 UTF-8/es_ES.UTF-8 UTF-8/' /etc/locale.gen && \
    dpkg-reconfigure --frontend=noninteractive locales && \
    rm -rf /var/lib/apt/lists/*

# 4. Establecer el directorio de trabajo
WORKDIR /app/backend

# 5. Copiar e instalar dependencias de Python
# Esto se cachea y solo se reconstruye si requirements.txt cambia
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copiar el resto del código de la aplicación
# Este paso es el que se reconstruirá más a menudo
COPY . .

# 7. Exponer el puerto
EXPOSE 8000