# 📈 Frontend - Trading Charts React App

Aplicación React moderna para visualización de gráficos de trading con TypeScript y SCSS.

## 🛠️ Tecnologías

- **Framework**: React 19
- **Lenguaje**: TypeScript
- **Estilos**: SCSS con sistema de diseño modular
- **Gráficos**: Lightweight Charts v5
- **Build Tool**: Create React App
- **Fuentes**: Inter (Google Fonts)

## 📦 Instalación

### Prerrequisitos
- Node.js (v16 o superior)
- npm o yarn

### Pasos de Instalación

1. **Instalar dependencias**
```bash
cd frontend
npm install
```

2. **Ejecutar en modo desarrollo**
```bash
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## 🏗️ Estructura del Proyecto

```
frontend/
├── public/                  # Archivos públicos
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/         # Componentes React
│   │   └── trading-charts.tsx
│   ├── styles/            # Archivos SCSS
│   │   ├── variables.scss
│   │   ├── mixins.scss
│   │   ├── components.scss
│   │   └── App.scss
│   ├── App.tsx
│   └── index.tsx
├── package.json
└── tsconfig.json
```

## 🎨 Sistema de Diseño

### Variables SCSS
- **Colores**: Paleta profesional para trading
- **Tipografía**: Inter con pesos optimizados
- **Espaciado**: Sistema modular de 8px
- **Sombras**: Sistema de profundidad visual

### Componentes
- **TradingChart**: Componente principal de gráficos
- **ControlPanel**: Panel de herramientas de análisis
- **TimePeriodBar**: Selector de períodos temporales

## 🔧 Características

### Gráficos
- **Velas Japonesas**: Visualización profesional
- **Períodos Múltiples**: 15m, 1h, 1d, 1w, 1m, 3m, 1y, 3y
- **Herramientas**: Líneas de tendencia, Fibonacci, medición
- **Información**: Precio, cambio, volumen, máximos/mínimos

### Interfaz
- **Responsive**: Mobile-first design
- **Space-Efficient**: Aprovecha al máximo el espacio
- **Modern UI**: Diseño profesional con SCSS
- **Accesibilidad**: Focus states y navegación por teclado

## 🚀 Scripts Disponibles

```bash
npm start          # Ejecutar en desarrollo
npm run build      # Construir para producción
npm test           # Ejecutar tests
npm run eject      # Eject (irreversible)
```

## 🔗 Integración con Backend

La aplicación se conecta al backend Django en `http://localhost:8000`:

- **API Endpoint**: `/api/market-data/`
- **CORS**: Configurado para desarrollo
- **Datos Mock**: Generación automática si no hay backend

## 📱 Responsive Design

- **Desktop**: Pantalla completa con controles optimizados
- **Tablet**: Layout adaptativo
- **Mobile**: Interfaz compacta con navegación táctil

## 🎯 Características Técnicas

- **TypeScript**: Tipado estático para robustez
- **React Hooks**: Estado moderno y efectos
- **SCSS Modules**: Estilos modulares y mantenibles
- **Performance**: Optimización de renderizado
- **Accessibility**: ARIA labels y navegación por teclado

## 📝 Licencia

MIT License - ver archivo LICENSE para más detalles.
