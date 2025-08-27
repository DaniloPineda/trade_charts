// frontend/src/App.tsx
import React, { JSX } from 'react';
import './styles/App.scss';
import TradingChart from './components/trading-charts.view';
import ReportsView from './components/reports';
import HeaderView from './components/header'; // <-- 1. Importa el nuevo Header
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App(): JSX.Element {
  return (
    // 2. El Router debe envolver toda la aplicación
    <Router>
      <div className="App">
        <HeaderView /> {/* 3. El Header va aquí, siempre visible */}
        <main>
          {/* 4. El contenido que cambia va dentro de Routes */}
          <Routes>
            <Route path="/reports" element={<ReportsView />} />
            <Route path="/" element={<TradingChart />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
