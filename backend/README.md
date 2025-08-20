# 🚀 Backend - Trading Charts API

Backend Django para la aplicación de gráficos de trading. Proporciona APIs RESTful para datos de mercado en tiempo real.

## 🛠️ Tecnologías

- **Framework**: Django 4.x
- **Base de Datos**: SQLite (desarrollo) / PostgreSQL (producción)
- **APIs**: Django REST Framework
- **Autenticación**: JWT (JSON Web Tokens)
- **Documentación**: Swagger/OpenAPI

## 📦 Instalación

### Prerrequisitos

- Python 3.8+
- pip
- virtualenv (recomendado)

### Pasos de Instalación

1. **Crear entorno virtual**

```bash
cd backend
python -m venv venv
```

2. **Activar entorno virtual**

```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. **Instalar dependencias**

```bash
pip install -r requirements.txt
```

4. **Configurar base de datos**

```bash
python manage.py migrate
```

5. **Crear superusuario (opcional)**

```bash
python manage.py createsuperuser
```

6. **Ejecutar servidor de desarrollo**

```bash
python manage.py runserver
```

El servidor estará disponible en `http://localhost:8000`

## 🏗️ Estructura del Proyecto

```
backend/
├── api/                    # Aplicaciones Django
│   ├── market_data/        # API para datos de mercado
│   └── users/              # API para usuarios
├── trade_charts/           # Configuración principal
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── manage.py
├── requirements.txt
└── README.md
```

## 🔧 APIs Disponibles

### Datos de Mercado

- `GET /api/market-data/` - Obtener datos de velas
- `GET /api/market-data/{symbol}/` - Datos específicos de un símbolo
- `GET /api/market-data/{symbol}/history/` - Historial de precios

### Usuarios

- `POST /api/auth/register/` - Registro de usuarios
- `POST /api/auth/login/` - Inicio de sesión
- `GET /api/auth/profile/` - Perfil del usuario

## 🔒 Variables de Entorno

Crea un archivo `.env` en el directorio `backend/`:

```env
DEBUG=True
SECRET_KEY=tu-secret-key-aqui
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

## 🧪 Testing

```bash
python manage.py test
```

## 📊 Base de Datos

### Modelos Principales

- **Symbol**: Símbolos de trading (SPY, QQQ, etc.)
- **CandleData**: Datos de velas japonesas
- **User**: Usuarios del sistema
- **Watchlist**: Listas de seguimiento de usuarios

## 🚀 Despliegue

### Desarrollo

```bash
python manage.py runserver
```

### Producción

```bash
python manage.py collectstatic
python manage.py migrate
gunicorn trade_charts.wsgi:application
```

## 📝 Licencia

MIT License - ver archivo LICENSE para más detalles.
