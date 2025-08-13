import React, { FC, useCallback, useEffect, useRef } from 'react';
import {
  UTCTimestamp,
  createChart,
  LineStyle,
  CandlestickSeries,
  IChartApi,
  ISeriesApi,
} from 'lightweight-charts';
import SymbolSearch from './symbol-search/symbol-search';
import { CandleData, TimePeriod } from '../dtos/ticker-data.dto';
import { observer } from 'mobx-react';
import tradingChartsViewModel from './trading-charts.viewmodel';
import {
  formatChange,
  formatChangePercent,
  formatPrice,
  formatVolume,
  getIntervalSeconds,
} from '../utils/chart-utils';

const TradingChart: FC<any> = observer(() => {
  const lastTimestampRef = useRef<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  let webSocket: WebSocket | null = null;

  const {
    isChartReady,
    selectedPeriod,
    ticker,
    activeTool,
    isLoading,
    priceChange,
    lastPrice,
    volume,
    high24h,
    low24h,
    timePeriods,
    setIsChartReady,
    setIsLoading,
    setTicker,
    setSelectedPeriod,
    setActiveTool,
    setLastPrice,
    setPriceChange,
    getHistoricalData,
    setHigh24h,
    setLow24h,
    setVolume,
  } = tradingChartsViewModel;

  useEffect(() => {
    const initializeCharts = (): IChartApi | null => {
      if (!chartContainerRef.current) return null;
      setIsLoading(true);
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
      setIsChartReady();
      return chart;
    };

    const loadInitialData = async () => {
      if (candleSeriesRef.current && chartRef.current) {
        const initialData = await getHistoricalData();
        candleSeriesRef.current.setData(initialData);
        chartRef.current.timeScale().fitContent();

        if (initialData.length > 0) {
          lastTimestampRef.current = initialData[initialData.length - 1]
            .time as number;
        }
        setIsLoading(false);
      }
    };

    const chart = initializeCharts();
    loadInitialData();

    const handleResize = () =>
      chart?.applyOptions({ width: chartContainerRef.current!.clientWidth });

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart?.remove();
    };
  }, []);

  useEffect(() => {
    if (!isChartReady || !candleSeriesRef.current || !chartRef.current) return;

    const subscribeLiveData = async () => {
      setIsLoading(true);
      try {
        const data = await getHistoricalData();
        candleSeriesRef.current?.setData(data);
        chartRef.current?.timeScale()?.fitContent();
        if (data.length > 0) {
          lastTimestampRef.current = data[data.length - 1].time as number;
        }
        setIsLoading(false);
        establishWebSocketConnection();
      } catch (err) {
        console.error('Failed to fetch historical data:', err);
        setIsLoading(false);
      }
    };

    const establishWebSocketConnection = () => {
      webSocket = new WebSocket(`ws://localhost:3000/ws/ticks/${ticker}/`);
      webSocket.onopen = () => console.log('WebSocket Connected!');
      webSocket.onclose = () => console.log('WebSocket Disconnected.');
      webSocket.onerror = (error) => console.error('WebSocket Error:', error);

      webSocket.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type !== 'ticker.update') return;

        const tick = msg.payload;

        // Ensure tick.time is always a number in seconds
        let tickSeconds = Number(tick.time);
        if (tickSeconds > 1e12) {
          // It's in ms
          tickSeconds = Math.floor(tickSeconds / 1000);
        }

        const intervalSeconds = getIntervalSeconds(selectedPeriod);

        // Align the candle start time to the interval
        const candleTimestamp = Math.floor(
          tickSeconds - (tickSeconds % intervalSeconds)
        ) as UTCTimestamp;

        const newCandle = {
          time: candleTimestamp,
          open: tick.open,
          high: tick.high,
          low: tick.low,
          close: tick.close,
        };

        // Get the last candle on the chart
        const candleSeriesData = candleSeriesRef.current?.data?.() || [];
        const lastCandle = candleSeriesData[
          candleSeriesData.length - 1
        ] as CandleData;
        const previousCandle = candleSeriesData[
          candleSeriesData.length - 2
        ] as CandleData;

        setLastPrice(tick.close);

        if (!lastCandle) {
          candleSeriesRef.current?.update(newCandle);
          return;
        }

        setPriceChange(previousCandle.close as number);
        setVolume(tick.volume as number);

        // Calculate additional metrics
        const prices = candleSeriesData.map((d: any) => d.close as number);
        setHigh24h(Math.max(...prices));
        setLow24h(Math.min(...prices));

        if (lastCandle.time === candleTimestamp) {
          // Update existing candle
          candleSeriesRef.current?.update(newCandle);
        } else if (candleTimestamp > (lastCandle.time as number)) {
          // Add new candle
          candleSeriesRef.current?.update(newCandle);
        }
      };
    };

    subscribeLiveData();

    return () => {
      if (webSocket) {
        console.log(`Closing WebSocket for ${ticker} | ${selectedPeriod}.`);
        webSocket.close();
      }
    };
  }, [ticker, selectedPeriod, isChartReady]);

  const handleSymbolSelected = (selectedSymbol: string) => {
    setTicker(selectedSymbol);
  };

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
  };

  const handleToolClick = (tool: string) => {
    setActiveTool(activeTool === tool ? 'none' : tool);
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
});

export default TradingChart;
