import React, { JSX, useEffect, useRef, useState } from 'react';
// La importación de tipos puede cambiar ligeramente en v5, pero esto debería ser compatible.
import {
  CandlestickSeries,
  createChart,
  UTCTimestamp,
} from 'lightweight-charts';
import SymbolSearch from './symbol-search/symbol-search';

// La interfaz de datos sigue siendo la misma
interface CandleData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

type TimePeriod = '15m' | '1h' | '1d' | '1w' | '1m' | '3m' | '1y' | '3y';

function TradingChart(): JSX.Element {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [ticker, setTicker] = useState<string>('AAPL');
  const [inputTicker, setInputTicker] = useState<string>('AAPL');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1d');
  const [activeTool, setActiveTool] = useState<string>('none');
  const [volume, setVolume] = useState<number | null>(null);
  const [high24h, setHigh24h] = useState<number | null>(null);
  const [low24h, setLow24h] = useState<number | null>(null);

  const timePeriods: TimePeriod[] = [
    '15m',
    '1h',
    '1d',
    '1w',
    '1m',
    '3m',
    '1y',
    '3y',
  ];

  useEffect(() => {
    if (!chartContainerRef.current) {
      return;
    }

    setIsLoading(true);

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: window.innerWidth >= 1024 ? window.innerHeight - 252 : 400,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#374151',
      },
      grid: {
        vertLines: { color: '#e5e7eb' },
        horzLines: { color: '#e5e7eb' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#2563eb',
          width: 1,
          style: 2,
        },
        horzLine: {
          color: '#2563eb',
          width: 1,
          style: 2,
        },
      },
      rightPriceScale: {
        borderColor: '#e5e7eb',
        textColor: '#6b7280',
      },
      timeScale: {
        borderColor: '#e5e7eb',
        timeVisible: true,
        secondsVisible: true,
      },
    });

    // ----- EL CAMBIO IMPORTANTE (v5) -----
    // Usamos el método genérico addSeries y especificamos 'Candlestick'
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // El resto de la lógica para obtener y mostrar datos es la misma
    fetch(
      `http://localhost:8000/api/market-data?ticker=${ticker}&period=${selectedPeriod}`
    )
      .then((res) => res.json())
      .then((data: CandleData[]) => {
        // Aseguramos que la serie exista antes de asignarle datos
        if (candleSeries && data.length > 0) {
          candleSeries.setData(data);

          // Calculate last price and change
          const lastCandle = data[data.length - 1];
          const previousCandle = data[data.length - 2];

          setLastPrice(lastCandle.close);
          if (previousCandle) {
            setPriceChange(lastCandle.close - previousCandle.close);
          }

          // Calculate additional metrics
          const prices = data.map((d) => d.close);
          setHigh24h(Math.max(...prices));
          setLow24h(Math.min(...prices));

          // Mock volume data
          setVolume(Math.floor(Math.random() * 1000000) + 500000);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        // Si hay error, generar datos mock para demostración
        const mockData: CandleData[] = [];
        const basePrice = 136.5;
        const now = Math.floor(Date.now() / 1000);

        for (let i = 0; i < 100; i++) {
          const time = now - (100 - i) * 60; // 1 minuto por punto
          const change = (Math.random() - 0.5) * 2;
          const open = basePrice + change;
          const close = open + (Math.random() - 0.5) * 1;
          const high = Math.max(open, close) + Math.random() * 0.5;
          const low = Math.min(open, close) - Math.random() * 0.5;

          mockData.push({
            time: time as UTCTimestamp,
            open,
            high,
            low,
            close,
          });
        }

        if (candleSeries) {
          candleSeries.setData(mockData);

          const lastCandle = mockData[mockData.length - 1];
          const previousCandle = mockData[mockData.length - 2];

          setLastPrice(lastCandle.close);
          if (previousCandle) {
            setPriceChange(lastCandle.close - previousCandle.close);
          }

          const prices = mockData.map((d) => d.close);
          setHigh24h(Math.max(...prices));
          setLow24h(Math.min(...prices));
          setVolume(Math.floor(Math.random() * 1000000) + 500000);
        }
        setIsLoading(false);
      });

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current!.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [ticker, selectedPeriod]);

  const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputTicker(e.target.value.toUpperCase());
  };

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
  };

  const handleToolClick = (tool: string) => {
    setActiveTool(activeTool === tool ? 'none' : tool);
  };

  const formatPrice = (price: number | null): string => {
    if (price === null) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const formatChange = (change: number | null): string => {
    if (change === null) return 'N/A';
    const sign = change >= 0 ? '+' : '';
    return `${sign}$${change.toFixed(2)}`;
  };

  const formatChangePercent = (
    change: number | null,
    lastPrice: number | null
  ): string => {
    if (change === null || lastPrice === null) return 'N/A';
    const percent = (change / (lastPrice - change)) * 100;
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const formatVolume = (volume: number | null): string => {
    if (volume === null) return 'N/A';
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  const handleSymbolSelected = (selectedSymbol: string) => {
    console.log('Nuevo símbolo seleccionado:', selectedSymbol);
    setTicker(selectedSymbol); // Actualiza el ticker para recargar el gráfico
  };

  return (
    <div className="trading-chart-container">
      <div className="chart-header">
        <h2 className="chart-title">
          <span></span>Gráfico de {ticker}
        </h2>
        <div className="chart-controls">
          <SymbolSearch onSymbolSelect={handleSymbolSelected} />
        </div>
      </div>

      <div className="control-panel">
        <div className="control-row">
          <div className="control-group">
            <span className="control-label">Indicador:</span>
            <select className="control-select">
              <option value="none">Ninguno</option>
              <option value="sma">SMA</option>
              <option value="ema">EMA</option>
              <option value="bollinger">Bollinger Bands</option>
              <option value="rsi">RSI</option>
            </select>
          </div>

          <div className="control-group">
            <span className="control-label">Período:</span>
            <input
              type="number"
              className="control-input"
              placeholder="14"
              min="1"
              max="200"
            />
          </div>

          <div className="tool-buttons">
            <button
              className={`tool-btn ${activeTool === 'trendline' ? 'active' : ''}`}
              onClick={() => handleToolClick('trendline')}
              title="Línea de tendencia"
            >
              📈
            </button>
            <button
              className={`tool-btn ${activeTool === 'fibonacci' ? 'active' : ''}`}
              onClick={() => handleToolClick('fibonacci')}
              title="Retroceso Fibonacci"
            >
              📊
            </button>
            <button
              className={`tool-btn ${activeTool === 'measure' ? 'active' : ''}`}
              onClick={() => handleToolClick('measure')}
              title="Medir distancia"
            >
              📏
            </button>
            <button
              className={`tool-btn ${activeTool === 'draw' ? 'active' : ''}`}
              onClick={() => handleToolClick('draw')}
              title="Dibujar"
            >
              ✏️
            </button>
          </div>
        </div>
      </div>

      <div className={`chart-area ${isLoading ? 'loading' : ''}`}>
        <div ref={chartContainerRef} className="chart-container" />
      </div>

      <div className="chart-info">
        <div
          className={`info-item ${priceChange && priceChange >= 0 ? 'positive' : 'negative'}`}
        >
          <span className="label">Precio:</span>
          <span className="value">{formatPrice(lastPrice)}</span>
        </div>
        <div
          className={`info-item ${priceChange && priceChange >= 0 ? 'positive' : 'negative'}`}
        >
          <span className="label">Cambio:</span>
          <span className="value">{formatChange(priceChange)}</span>
        </div>
        <div
          className={`info-item ${priceChange && priceChange >= 0 ? 'positive' : 'negative'}`}
        >
          <span className="label">%:</span>
          <span className="value">
            {formatChangePercent(priceChange, lastPrice)}
          </span>
        </div>
        <div className="info-item">
          <span className="label">Vol:</span>
          <span className="value">{formatVolume(volume)}</span>
        </div>
        <div className="info-item">
          <span className="label">Máx:</span>
          <span className="value">{formatPrice(high24h)}</span>
        </div>
        <div className="info-item">
          <span className="label">Mín:</span>
          <span className="value">{formatPrice(low24h)}</span>
        </div>
      </div>

      <div className="time-period-bar">
        <div className="period-buttons">
          {timePeriods.map((period) => (
            <button
              key={period}
              className={`period-btn ${selectedPeriod === period ? 'active' : ''}`}
              onClick={() => handlePeriodChange(period)}
            >
              {period}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TradingChart;
