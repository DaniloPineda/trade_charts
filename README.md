# 📈 Trading Charts - Gráficos de Trading

Una aplicación moderna de gráficos de trading construida con React, TypeScript y SCSS. Proporciona una interfaz profesional para el análisis de mercados financieros en tiempo real.

## ✨ Características

- **Gráficos de Velas Japonesas** - Visualización profesional de precios
- **Interfaz Moderna** - Diseño responsive con SCSS y principios de color theory
- **Panel de Control** - Herramientas de análisis técnico integradas
- **Períodos Múltiples** - 15m, 1h, 1d, 1w, 1m, 3m, 1y, 3y
- **Información en Tiempo Real** - Precio, cambio, volumen, máximos y mínimos
- **Herramientas de Dibujo** - Líneas de tendencia, Fibonacci, medición
- **Diseño Space-Efficient** - Aprovecha al máximo el espacio de pantalla

## 🚀 Tecnologías

- **Frontend**: React 19, TypeScript, SCSS
- **Backend**: Django 4.x, Django REST Framework
- **Gráficos**: Lightweight Charts v5
- **Base de Datos**: SQLite (desarrollo) / PostgreSQL (producción)
- **Estilos**: Sistema de diseño modular con variables SCSS
- **Responsive**: Mobile-first design

## 📦 Instalación

### Prerrequisitos

- Node.js (v16 o superior)
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**

```bash
git clone https://github.com/tu-usuario/trading-charts.git
cd trading-charts
```

2. **Configurar el Backend**

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

3. **Configurar el Frontend**

```bash
cd frontend
npm install
npm start
```

- **Backend**: `http://localhost:8000`
- **Frontend**: `http://localhost:3000`

## 🏗️ Estructura del Proyecto

```
trading_charts/
├── frontend/                 # Aplicación React
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── styles/          # Archivos SCSS
│   │   │   ├── variables.scss
│   │   │   ├── mixins.scss
│   │   │   ├── components.scss
│   │   │   └── App.scss
│   │   └── App.tsx
│   ├── package.json
│   └── README.md
├── backend/                  # API Django
│   ├── apis/               # Aplicaciones Django
│   ├── trade_charts/       # Configuración principal
│   ├── manage.py
│   ├── requirements.txt
│   └── README.md
└── README.md
```

## 🎨 Sistema de Diseño

### Paleta de Colores

- **Primario**: Azul (#2563eb) - Confianza y estabilidad
- **Secundario**: Verde (#10b981) - Crecimiento y éxito
- **Éxito**: Verde (#10b981) - Movimientos positivos
- **Peligro**: Rojo (#ef4444) - Movimientos negativos

### Características

- **Tipografía**: Inter (Google Fonts)
- **Espaciado**: Sistema modular de 8px
- **Sombras**: Sistema de profundidad visual
- **Responsive**: Breakpoints optimizados

## 🔧 Uso

### Cambiar Símbolo

1. Ingresa el símbolo en el campo de texto (ej: AAPL, TSLA, GOOGL)
2. Haz clic en "Cargar"
3. El gráfico se actualizará automáticamente

### Cambiar Período

- Haz clic en cualquier botón de período (15m, 1h, 1d, etc.)
- El gráfico se ajustará al período seleccionado

### Herramientas de Análisis

- **Indicadores**: Selecciona SMA, EMA, Bollinger Bands, RSI
- **Período**: Configura el período del indicador
- **Herramientas**: Líneas de tendencia, Fibonacci, medición, dibujo

## 📱 Responsive Design

La aplicación se adapta perfectamente a:

- **Desktop**: Pantalla completa con controles optimizados
- **Tablet**: Layout adaptativo con controles reorganizados
- **Mobile**: Interfaz compacta con navegación táctil

## 🎯 Características Técnicas

- **TypeScript**: Tipado estático para mayor robustez
- **SCSS**: Sistema de estilos modular y mantenible
- **Lightweight Charts**: Gráficos de alto rendimiento
- **React Hooks**: Estado moderno y efectos secundarios
- **Responsive**: Mobile-first approach

## 🔮 Roadmap

- [ ] Backend API con Python/FastAPI
- [ ] Datos reales de mercado
- [ ] Más indicadores técnicos
- [ ] Alertas de precio
- [ ] Historial de transacciones
- [ ] Múltiples timeframes
- [ ] Exportación de gráficos

## 🤝 Contribuciones

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👨‍💻 Autor

**Tu Nombre**

- GitHub: [@DaniloPineda](https://github.com/DaniloPineda)
- LinkedIn: [Danilo Pineda](https://www.linkedin.com/in/danilopineda93/)

## 🙏 Agradecimientos

- [Lightweight Charts](https://github.com/tradingview/lightweight-charts) por la librería de gráficos
- [Inter Font](https://rsms.me/inter/) por la tipografía
- [React](https://reactjs.org/) por el framework
- [TypeScript](https://www.typescriptlang.org/) por el tipado estático

---

⭐ Si te gusta este proyecto, ¡dale una estrella en GitHub!
