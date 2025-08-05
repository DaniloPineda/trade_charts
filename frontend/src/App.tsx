import React, { JSX } from 'react';
import './styles/App.scss';
import TradingChart from './components/trading-charts';

function App(): JSX.Element {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Gráfico de Trading</h1>
      </header>
      <main>
        <TradingChart />
      </main>
    </div>
  );
}

export default App;