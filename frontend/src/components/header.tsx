// frontend/src/components/Header.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const HeaderView: React.FC = () => {
  return (
    <header className="app-header">
      <div className="logo">
        <Link to="/">TradeCharts 📈</Link>
        <span>Soy un imán para el dinero 💰 💰 💰</span>
      </div>
      <nav className="main-nav">
        <Link to="/">Gráfico</Link>
        <Link to="/reports">Reportes</Link>
      </nav>
    </header>
  );
};

export default HeaderView;
