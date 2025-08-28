import React, { FC, useEffect, useRef } from 'react';
import './../styles/charts.scss';
import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts';
import SymbolSearch from './symbol-search/symbol-search.view';
import { CandleData, TimePeriod } from '../dtos/ticker-data.dto';
import { observer } from 'mobx-react';
import tradingChartsViewModel from './trading-charts.viewmodel';
import {
  formatChange,
  formatChangePercent,
  formatPrice,
  formatVolume,
  toTs,
} from '../utils/chart-utils';
import DrawingCanvas from './drawing-canvas';
import { sma } from '../utils/indicators';
import { DrawIcon, ToolType } from './shared';
import TimeScrollbar from './time-scrollbar';

const favoriteETFs = [
  'SPY',
  'QQQ',
  'TNA',
  'NVDA',
  'AAPL',
  'META',
  'AMZN',
  'TSLA',
  'NFLX',
  'PLTR',
  'BAC',
  'SLV',
  'GLD',
  'CVX',
  'XOM',
];
const FUTURE_BARS = 15;

const TradingChart: FC<any> = observer(() => {
  const lastTimestampRef = useRef<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const totalBarsRef = useRef(0);

  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const s20Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const s40Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const s100Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const s200Ref = useRef<ISeriesApi<'Line'> | null>(null);

  // local cache (evitamos .data() que no existe en v5)
  const barsRef = useRef<CandleData[]>([]);
  const lastBarRef = useRef<CandleData | null>(null);
  const prevBarRef = useRef<CandleData | null>(null);

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
    refresh,
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
    setRefresh,
  } = tradingChartsViewModel;

  // Create chart & series
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    setIsLoading(true);

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: window.innerWidth >= 1024 ? window.innerHeight - 300 : 400,
      layout: {
        background: { type: ColorType.Solid, color: '#0f172a' },
        textColor: '#e5e7eb',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#2563eb', width: 1, style: LineStyle.Dotted },
        horzLine: { color: '#2563eb', width: 1, style: LineStyle.Dotted },
      },
      rightPriceScale: { borderColor: '#334155' },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: '',
      priceFormat: { type: 'volume' },
      base: 0,
    });

    const s20 = chart.addSeries(LineSeries, { color: '#22d3ee', lineWidth: 2 });
    const s40 = chart.addSeries(LineSeries, { color: '#a78bfa', lineWidth: 2 });
    const s100 = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 2,
    });
    const s200 = chart.addSeries(LineSeries, {
      color: '#ef4444',
      lineWidth: 2,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candle;
    volumeSeriesRef.current = volume;
    s20Ref.current = s20;
    s40Ref.current = s40;
    s100Ref.current = s100;
    s200Ref.current = s200;

    (async () => {
      const raw = await getHistoricalData(); // [{time, open, high, low, close, volume}]
      const rows: CandleData[] = raw.map((r) => ({
        time: toTs(r.time),
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
      }));

      barsRef.current = rows;
      lastBarRef.current = rows.at(-1) ?? null;
      prevBarRef.current = rows.at(-2) ?? null;

      candle.setData(rows);
      volume.setData(rows.map((r) => ({ time: r.time, value: r.volume })));

      s20.setData(sma(rows, 20));
      s40.setData(sma(rows, 40));
      s100.setData(sma(rows, 100));
      s200.setData(sma(rows, 200));

      chart.timeScale().scrollToPosition(-FUTURE_BARS, false);

      if (rows.length)
        lastTimestampRef.current = rows[rows.length - 1].time as number;
      setIsChartReady();
      setIsLoading(false);
    })();

    const ro = new ResizeObserver(() => {
      if (!chartContainerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: window.innerWidth >= 1024 ? window.innerHeight - 300 : 400,
      });
    });
    ro.observe(chartContainerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      s20Ref.current =
        s40Ref.current =
        s100Ref.current =
        s200Ref.current =
          null;
    };
  }, []);

  // Load by ticker/period + (optional) live
  useEffect(() => {
    if (!isChartReady || !candleSeriesRef.current || !chartRef.current) return;
    const chart = chartRef.current;

    const fetchAndSet = async () => {
      setIsLoading(true);
      try {
        const prevPos = chart.timeScale().scrollPosition();
        const raw = await getHistoricalData();
        const rows: CandleData[] = raw.map((r) => ({
          time: toTs(r.time),
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
          volume: r.volume,
        }));

        barsRef.current = rows;
        lastBarRef.current = rows.at(-1) ?? null;
        prevBarRef.current = rows.at(-2) ?? null;

        candleSeriesRef.current!.setData(rows);
        volumeSeriesRef.current!.setData(
          rows.map((r) => ({ time: r.time, value: r.volume }))
        );
        totalBarsRef.current = rows.length;

        s20Ref.current!.setData(sma(rows, 20));
        s40Ref.current!.setData(sma(rows, 40));
        s100Ref.current!.setData(sma(rows, 100));
        s200Ref.current!.setData(sma(rows, 200));

        if (prevPos !== 0) chart.timeScale().scrollToPosition(prevPos, false);
        else chart.timeScale().scrollToPosition(-FUTURE_BARS, false);

        if (rows.length)
          lastTimestampRef.current = rows[rows.length - 1].time as number;
      } finally {
        setIsLoading(false);
        setRefresh(false);
      }
    };

    fetchAndSet();

    // Live (opcional)
    // const ws = new WebSocket(`ws://localhost:3000/ws/ticks/${ticker}/`);
    // webSocket = ws; ...

    return () => {
      if (webSocket) {
        webSocket.close();
        webSocket = null;
      }
    };
  }, [ticker, selectedPeriod, isChartReady, refresh]);

  const handleSymbolSelected = (s: string) => setTicker(s);
  const handlePeriodChange = (p: TimePeriod) => setSelectedPeriod(p);
  const handleToolClick = (tool: ToolType) =>
    setActiveTool(activeTool === tool ? ToolType.None : tool);

  return (
    <div className={`chart-wrap`}>
      <div className="trading-chart-container">
        <div className="toolbar">
          <div className="fav-row">
            {favoriteETFs.map((sym) => (
              <button
                key={sym}
                className={`ticker-btn ${ticker === sym ? 'ticker-btn--active' : ''}`}
                onClick={() => setTicker(sym)}
              >
                {sym}
              </button>
            ))}
            <button onClick={() => setRefresh(true)}>Refresh</button>
          </div>
        </div>

        <div className="chart-header">
          <h2 className="chart-title">Gráfico de {ticker}</h2>
          <div className="chart-controls">
            <SymbolSearch onSymbolSelect={handleSymbolSelected} />
          </div>
        </div>

        <div className={`chart-area ${isLoading ? 'loading' : ''}`}>
          <div ref={chartContainerRef} className="chart-container" />
          {chartRef.current && (
            <TimeScrollbar
              chart={chartRef.current}
              totalBars={totalBarsRef.current}
              futureBars={120}
            />
          )}
          {chartRef.current &&
            candleSeriesRef.current &&
            chartContainerRef.current && (
              <DrawingCanvas
                targetRef={chartContainerRef}
                chart={chartRef.current}
                series={candleSeriesRef.current}
                storageKey={`${ticker}:${selectedPeriod}`}
                tool={activeTool as any}
                onFinishDraw={() => setActiveTool(ToolType.None)}
                onSetTool={(tool) => setActiveTool(tool)}
              />
            )}
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
          <div className="draw-tools">
            {[
              ToolType.None,
              ToolType.Select,
              ToolType.Line,
              ToolType.Rect,
              ToolType.Circle,
              ToolType.Erase,
            ].map((t) => (
              <button
                key={t}
                className={`ticker-btn icon ${activeTool === t ? 'ticker-btn--active' : ''}`}
                onClick={() => handleToolClick(t)}
                aria-label={t}
                title={t}
              >
                <DrawIcon type={t} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TradingChart;
