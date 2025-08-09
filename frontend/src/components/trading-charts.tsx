import React, { JSX, useEffect, useRef, useState } from 'react';
import {
  CandlestickSeries,
  createChart,
  UTCTimestamp,
  ISeriesApi,
  IChartApi,
  LineStyle,
} from 'lightweight-charts';
import SymbolSearch from './symbol-search/symbol-search';

// Data interface for a single candlestick
interface CandleData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}

// Allowed time periods
type TimePeriod = '1m' | '15m' | '1h' | '1d' | '1w' | '3m' | '1y' | '3y';
const timePeriods: TimePeriod[] = [
  '1m',
  '15m',
  '1h',
  '1d',
  '1w',
  '3m',
  '1y',
  '3y',
];

function TradingChart(): JSX.Element {
  const lastTimestampRef = useRef<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const liveCandleRef = useRef<CandleData | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  // Component State
  const [ticker, setTicker] = useState<string>('AAPL');
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1m');
  const [activeTool, setActiveTool] = useState<string>('none');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // State for the info bar
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [volume, setVolume] = useState<number | null>(null); // This will remain mock data
  const [high24h, setHigh24h] = useState<number | null>(null);
  const [low24h, setLow24h] = useState<number | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: window.innerWidth >= 1024 ? window.innerHeight - 300 : 400,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#374151',
      },
      grid: {
        vertLines: { color: '#e5e7eb' },
        horzLines: { color: '#e5e7eb' },
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: { color: '#2563eb', width: 1, style: LineStyle.Dotted },
        horzLine: { color: '#2563eb', width: 1, style: LineStyle.Dotted },
      },
      rightPriceScale: { borderColor: '#e5e7eb' },
      timeScale: {
        borderColor: '#e5e7eb',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;

    const handleResize = () =>
      chart.applyOptions({ width: chartContainerRef.current!.clientWidth });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;

    setIsLoading(true);
    const candleSeries = candleSeriesRef.current;
    const chart = chartRef.current;

    // This will be our active WebSocket connection for this effect cycle
    let ws: WebSocket | null = null;

    const getIntervalSeconds = (period: TimePeriod): number => {
      switch (period) {
        case '1m':
          return 60;
        case '15m':
          return 15 * 60;
        case '1h':
          return 60 * 60;
        default:
          return 24 * 60 * 60;
      }
    };
    const intervalSeconds = getIntervalSeconds(selectedPeriod);

    // 1. Fetch historical data first
    fetch(
      `http://localhost/api/market-data?ticker=${ticker}&period=${selectedPeriod}`
    )
      .then((res) => res.json())
      .then((data: CandleData[]) => {
        candleSeries.setData(data);
        chart.timeScale().fitContent();

        if (data.length > 0) {
          lastTimestampRef.current = data[data.length - 1].time as number;
        }
        liveCandleRef.current = null; // Reset live candle after history loads
        setIsLoading(false);

        // 2. Establish WebSocket connection ONLY AFTER historical data is loaded
        ws = new WebSocket(`ws://localhost/ws/ticks/${ticker}/`);
        ws.onopen = () => console.log('WebSocket Connected!');
        ws.onclose = () => console.log('WebSocket Disconnected.');
        ws.onerror = (error) => console.error('WebSocket Error:', error);

        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === 'ticker.update') {
            const tick = message.payload as { time: number; close: number };

            if (tick.time <= (lastTimestampRef.current ?? 0)) {
              return; // Ignore old tick
            }
            lastTimestampRef.current = tick.time;

            const candleTimestamp = (tick.time -
              (tick.time % intervalSeconds)) as UTCTimestamp;
            let currentCandle = liveCandleRef.current;

            if (!currentCandle) {
              // If this is the first tick, check if it belongs to the last historical candle
              const lastHistoricalCandle =
                data.length > 0 ? data[data.length - 1] : null;
              if (
                lastHistoricalCandle &&
                candleTimestamp === lastHistoricalCandle.time
              ) {
                currentCandle = lastHistoricalCandle;
              }
            }

            if (!currentCandle || candleTimestamp > currentCandle.time) {
              const newCandle: CandleData = {
                time: candleTimestamp,
                open: tick.close,
                high: tick.close,
                low: tick.close,
                close: tick.close,
              };
              liveCandleRef.current = newCandle;
            } else {
              currentCandle.high = Math.max(currentCandle.high, tick.close);
              currentCandle.low = Math.min(currentCandle.low, tick.close);
              currentCandle.close = tick.close;
            }

            candleSeries.update(liveCandleRef.current!);
            setLastPrice(tick.close);
          }
        };
      })
      .catch((err) => {
        console.error('Failed to fetch historical data:', err);
        setIsLoading(false);
      });

    // Cleanup function: This will run when the effect re-runs (ticker or period change)
    return () => {
      if (ws) {
        console.log(`Closing WebSocket for ${ticker} | ${selectedPeriod}.`);
        ws.close();
      }
    };
  }, [ticker, selectedPeriod]);

  // --- Event Handlers and Formatters ---
  const handleSymbolSelected = (selectedSymbol: string) => {
    setTicker(selectedSymbol);
  };

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
  };

  const handleToolClick = (tool: string) => {
    setActiveTool(activeTool === tool ? 'none' : tool);
  };

  // Formatters (formatPrice, formatChange, etc. remain the same)
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

  return (
    <div className="trading-chart-container">
      <div className="chart-header">
        <h2 className="chart-title">Gráfico de {ticker}</h2>
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

      {/* --- Info Bar --- */}
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

      {/* -- Time period selector -- */}
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
