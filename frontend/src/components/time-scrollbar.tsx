import React, { useEffect, useState } from 'react';
import type { IChartApi, Logical } from 'lightweight-charts';

const L = (n: number) => n as unknown as Logical;
const LN = (l: Logical) => l as unknown as number;

export default function TimeScrollbar({
  chart,
  totalBars,
  futureBars = 100,
}: {
  chart: IChartApi;
  totalBars: number; // = número de velas cargadas
  futureBars?: number; // margen a la derecha
}) {
  const ts = chart.timeScale();
  const [pos, setPos] = useState(0);
  const [max, setMax] = useState(0);

  const syncFromChart = () => {
    const vr = (ts as any).getVisibleLogicalRange?.();
    if (!vr) return;
    const from = LN(vr.from),
      to = LN(vr.to);
    const visible = to - from;
    const total = totalBars + futureBars;
    const maxRange = Math.max(0, total - visible);
    setPos(Math.min(Math.max(from, 0), maxRange));
    setMax(maxRange);
  };

  useEffect(() => {
    syncFromChart();
    const fn = () => syncFromChart();
    ts.subscribeVisibleTimeRangeChange(fn);
    (ts as any).subscribeVisibleLogicalRangeChange?.(fn);
    return () => {
      ts.unsubscribeVisibleTimeRangeChange(fn);
      (ts as any).unsubscribeVisibleLogicalRangeChange?.(fn);
    };
  }, [chart, totalBars, futureBars]);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const value = Number(e.target.value);
    const vr = (ts as any).getVisibleLogicalRange?.();
    if (!vr) return;
    const from = LN(vr.from),
      to = LN(vr.to);
    const visible = to - from;
    const newFrom = value;
    const newTo = value + visible;
    ts.setVisibleLogicalRange({ from: L(newFrom), to: L(newTo) } as any);
    setPos(value);
  };

  return (
    <div className="time-scroll">
      <input
        type="range"
        min={0}
        max={Math.max(0, Math.round(max))}
        step={1}
        value={Math.round(pos)}
        onChange={onChange}
        aria-label="Time scrollbar"
      />
    </div>
  );
}
