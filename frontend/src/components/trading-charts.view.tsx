import React, { FC, useCallback, useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  Time,
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
import { sma } from '../utils/indicators';
import { DrawIcon, EyeIcon, EyeOffIcon, RefreshIcon, ToolType } from './shared';
import TimeScrollbar from './time-scrollbar';
import MarketStatus from './market-status';
import DrawingCanvas from './drawing-canvas';
//import DrawingCanvas from './drawing-canvas/drawing-canvas';

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
  const [dataEpoch, setDataEpoch] = useState(0);
  const lastKeyRef = useRef<string | null>(null);

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
    drawingColor,
    drawingWidth,
    drawingsVisible,
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
    setDrawingColor,
    setDrawingWidth,
    setDrawingsVisible,
  } = tradingChartsViewModel;

  const tz = 'America/Chicago';
  const partsToHM = (d: Date) => {
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const val = (t: string) => p.find((x) => x.type === t)?.value ?? '';
    return `${val('hour')}:${val('minute')}`;
  };

  const bumpEpoch = useCallback(() => {
    // Espera 2 frames para que LWC asiente layout y luego notifica
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setDataEpoch((n) => n + 1))
    );
  }, []);

  // Create chart & series
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const getSize = () => ({
      width: Math.max(0, chartContainerRef.current!.clientWidth),
      height: Math.max(0, chartContainerRef.current!.clientHeight),
    });

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    setIsLoading(true);

    const { width, height } = getSize();

    const chart = createChart(chartContainerRef.current, {
      width,
      height,
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

    chart.applyOptions({
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: Time) => {
          const ts = (time as unknown as number) * 1000;
          return partsToHM(new Date(ts));
        },
      },
    });

    const candle = chart.addSeries(CandlestickSeries, {
      priceScaleId: 'right',
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    candle.applyOptions({
      lastValueVisible: true, // muestra etiqueta en el eje derecho
      priceLineVisible: true, // y la línea horizontal
      priceLineColor: '#064e3b', // verde oscuro (emerald-900 aprox.)
      priceLineStyle: LineStyle.Solid,
      priceLineWidth: 2,
    });

    const volume = chart.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chart.priceScale('right').applyOptions({
      scaleMargins: { top: 0.05, bottom: 0.25 }, // velas ocupan ~75% arriba
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0.0 }, // volumen ocupa ~20% abajo
    });

    const s20 = chart.addSeries(LineSeries, {
      color: '#ffdb50',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    const s40 = chart.addSeries(LineSeries, {
      color: '#ed7830',
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    const s100 = chart.addSeries(LineSeries, {
      color: '#9430ed',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    const s200 = chart.addSeries(LineSeries, {
      color: '#274feb',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candle;
    volumeSeriesRef.current = volume;
    s20Ref.current = s20;
    s40Ref.current = s40;
    s100Ref.current = s100;
    s200Ref.current = s200;

    (async () => {
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

      candle.setData(rows);
      volume.setData(rows.map((r) => ({ time: r.time, value: r.volume })));

      s20.setData(sma(rows, 20));
      s40.setData(sma(rows, 40));
      s100.setData(sma(rows, 100));
      s200.setData(sma(rows, 200));

      const ts = chart.timeScale();
      ts.fitContent();
      ts.scrollToPosition(-FUTURE_BARS, false);

      bumpEpoch();

      if (rows.length)
        lastTimestampRef.current = rows[rows.length - 1].time as number;
      setIsChartReady();
      setDataEpoch((v) => v + 1);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setDataEpoch((e) => e + 1));
      });
      setIsLoading(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsLoading(false));
      });
    })();

    const ro = new ResizeObserver(() => {
      if (!chartRef.current || !chartContainerRef.current) return;
      const { width, height } = getSize();
      chartRef.current.resize(width, height);
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
      const key = `${ticker}:${selectedPeriod}`;
      const prevPos = chart.timeScale().scrollPosition();
      setIsLoading(true);
      setDataEpoch((v) => v + 1);
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

        const ts = chart.timeScale();
        if (lastKeyRef.current !== key) {
          // símbolo/periodo nuevo → auto-ajuste
          ts.fitContent();
          ts.scrollToPosition(-FUTURE_BARS, false);
          lastKeyRef.current = key;
        } else {
          // mismo símbolo/periodo → respeta la vista del usuario
          if (prevPos !== 0) ts.scrollToPosition(prevPos, false);
          else ts.scrollToPosition(-FUTURE_BARS, false);
        }

        bumpEpoch();

        if (rows.length)
          lastTimestampRef.current = rows[rows.length - 1].time as number;

        setDataEpoch((v) => v + 1);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setDataEpoch((e) => e + 1));
        });
      } finally {
        setIsLoading(false);
        setRefresh(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setIsLoading(false));
        });
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
    <div className="chart-wrap">
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
            <button
              className={`refresh-btn ${refresh ? 'is-loading' : ''}`}
              onClick={() => setRefresh(true)}
              title="Refrescar datos"
              disabled={refresh}
            >
              <RefreshIcon className="icon" />
              <span>Recargar</span>
            </button>
          </div>
        </div>

        <div className="chart-header">
          <h2 className="chart-title">Símbolo {ticker}</h2>
          <MarketStatus />
          <div className="chart-controls">
            <SymbolSearch onSymbolSelect={handleSymbolSelected} />
          </div>
        </div>

        <div className="draw-controls">
          <label className="ctrl">
            <input
              type="color"
              value={drawingColor}
              onChange={(e) => setDrawingColor(e.target.value)}
              title="Color de dibujo"
            />
            <span>Color</span>
          </label>

          <label className="ctrl">
            <input
              type="range"
              min={1}
              max={6}
              step={1}
              value={drawingWidth}
              onChange={(e) => setDrawingWidth(Number(e.target.value))}
              title="Grosor"
            />
            <span>{drawingWidth}px</span>
          </label>

          <button
            className={`icon-btn ${drawingsVisible ? 'active' : ''}`}
            onClick={() => setDrawingsVisible(!drawingsVisible)}
            aria-pressed={drawingsVisible}
            title={drawingsVisible ? 'Ocultar dibujos' : 'Mostrar dibujos'}
          >
            {drawingsVisible ? (
              <EyeIcon className="icon" />
            ) : (
              <EyeOffIcon className="icon" />
            )}
          </button>
        </div>

        <div className={`chart-area${isLoading ? ' loading' : ''}`}>
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
                key={`draw-${ticker}:${selectedPeriod}`}
                targetRef={chartContainerRef}
                chart={chartRef.current}
                series={candleSeriesRef.current}
                storageKey={`${ticker}:${selectedPeriod}`}
                tool={activeTool}
                onFinishDraw={() => setActiveTool(ToolType.None)}
                onSetTool={setActiveTool}
                drawingColor={drawingColor}
                drawingWidth={drawingWidth}
                drawingsVisible={drawingsVisible}
                dataEpoch={dataEpoch}
                isLoading={isLoading}
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
