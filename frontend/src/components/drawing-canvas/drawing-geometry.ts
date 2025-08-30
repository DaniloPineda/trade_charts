import type {
    ISeriesApi,
    ITimeScaleApi,
    Time,
    Logical,
    Coordinate,
    UTCTimestamp,
  } from 'lightweight-charts';
  import { ToolType } from '../shared'; // 👈 ajusta
  import {
    CN, LN,
    type DataPt, type LogicalRange, type Shape, HANDLE_R,
  } from './drawing-types';
  
  export function visibleLogicalSafe(ts: ITimeScaleApi<Time>): LogicalRange | null {
    const lr = (ts as any).getVisibleLogicalRange?.();
    if (lr && lr.from != null && lr.to != null) return lr as LogicalRange;
  
    const tr = ts.getVisibleRange?.();
    if (!tr || tr.from == null || tr.to == null) return null;
  
    const xf = ts.timeToCoordinate(tr.from as UTCTimestamp);
    const xt = ts.timeToCoordinate(tr.to as UTCTimestamp);
    if (xf == null || xt == null) return null;
  
    const lf = ts.coordinateToLogical(xf);
    const lt = ts.coordinateToLogical(xt);
    if (lf == null || lt == null) return null;
  
    return { from: lf as any, to: lt as any };
  }
  
  const estimateXFromLogical = (
    ts: ITimeScaleApi<Time>,
    l: Logical,
    getCanvas: () => HTMLCanvasElement | null
  ): number | null => {
    const vr = visibleLogicalSafe(ts);
    const c = getCanvas();
    if (!vr || !c) return null;
    const from = LN(vr.from), to = LN(vr.to);
    if (to === from) return null;
    const w = c.clientWidth;
    const x = ((LN(l) - from) / (to - from)) * w;
    // opcional: clamp suave para evitar bleeding
    return Math.max(-64, Math.min(w + 64, x));
  };

  
  export function makeGeometryUtils(deps: {
    ts: ITimeScaleApi<Time>;
    series: ISeriesApi<'Candlestick'> | null;
    getCanvas: () => HTMLCanvasElement | null;
    isScalingRef: React.MutableRefObject<boolean>;
    pxCache: React.MutableRefObject<Map<string,{x:number;y:number}>>;
  }) {
    const { ts, series, getCanvas, isScalingRef, pxCache } = deps;
  
    const logicalToX = (l: Logical): number | null => {
      const c = ts.logicalToCoordinate(l as any);
      return c == null ? null : CN(c as Coordinate);
    };
    const xToLogical  = (x: number): Logical | null => ts.coordinateToLogical(x) as any;
    const priceToY    = (p: number): number | null => {
      const c = (series as any)?.priceToCoordinate?.(p);
      return c == null ? null : CN(c as Coordinate);
    };
    const yToPrice    = (y: number): number | null => (series as any)?.coordinateToPrice?.(y) ?? null;
  
    const toPx = (d: DataPt): {x:number;y:number} | null => {
      const cEl = getCanvas(); if (!cEl) return null;
      let x = logicalToX(d.logical);
      if (x == null) {
        const vr = visibleLogicalSafe(ts);
        if (vr) {
          const from = LN(vr.from), to = LN(vr.to), l = LN(d.logical);
          x = l < from ? 0 : l > to ? cEl.clientWidth : null;
        }
      }
      const y = priceToY(d.price);
      if (x == null || y == null) return null;
      return { x, y };
    };
  
    const getPt = (s: Shape, key: 'a'|'b'|'c'|'e'): DataPt | null => {
      const v = (s as any)[key];
      if (!v || v.logical == null || typeof v.price !== 'number') return null;
      return v as DataPt;
    };
  
    const toPxWithCache = (shapeId: string, key:'a'|'b'|'c'|'e', d: DataPt | null | undefined) => {
      const cEl = getCanvas();
      if (!cEl || !d || d.logical == null || typeof d.price !== 'number') return null;
  
      // X
      let x: number | null = null;
      const cx = ts.logicalToCoordinate(d.logical as any);
      x = cx != null ? CN(cx as Coordinate) : null;
      if (x == null) {
        const vr = visibleLogicalSafe(ts);
        if (vr) {
          const from = LN(vr.from), to = LN(vr.to), l = LN(d.logical);
          x = l < from ? 0 : l > to ? cEl.clientWidth : null;
        }
      }
      // Y
      let y: number | null = null;
      const cy = (series as any)?.priceToCoordinate?.(d.price);
      y = cy != null ? CN(cy as Coordinate) : null;
  
      const cacheKey = `${shapeId}:${key}`;
      const prev = pxCache.current.get(cacheKey);
      if (y == null && prev && isScalingRef.current) y = prev.y;
  
      if (x != null && y != null) {
        pxCache.current.set(cacheKey, { x, y });
        return { x, y };
      }
      return null;
    };
  
    const handlesPx = (s: Shape): {x:number;y:number;name:'a'|'b'|'c'|'e'}[] => {
      const hs:any[] = [];
      if (s.t===ToolType.Line)  { const a=toPx(s.a), b=toPx(s.b); if (a&&b){ hs.push({ ...a, name:'a' }); hs.push({ ...b, name:'b' }); } }
      if (s.t===ToolType.Rect)  { const a=toPx(s.a), b=toPx(s.b); if (a&&b){ hs.push({ ...a, name:'a' }); hs.push({ ...b, name:'b' }); } }
      if (s.t===ToolType.Circle){ const c=toPx(s.c), e=toPx(s.e); if (c&&e){ hs.push({ ...c, name:'c' }); hs.push({ ...e, name:'e' }); } }
      return hs;
    };
  
    const hitHandlePx = (x:number, y:number, selected?: Shape | null) => {
      if (!selected) return null;
      for (const h of handlesPx(selected))
        if (Math.hypot(h.x - x, h.y - y) <= HANDLE_R + 2) return { id: selected.id, name: h.name as 'a'|'b'|'c'|'e' };
      return null;
    };
  
    const hitShapeIdAt = (x:number, y:number, shapes: Shape[]): string | null => {
      const pad = 6;
      for (let i=shapes.length-1; i>=0; i--) {
        const s = shapes[i];
        if (s.t === ToolType.Line) {
          const a = toPx(s.a), b = toPx(s.b); if (!a || !b) continue;
          const A = b.y - a.y, B = a.x - b.x, C = b.x*a.y - a.x*b.y;
          const dist = Math.abs(A*x + B*y + C) / Math.hypot(A, B);
          const inBox = Math.min(a.x,b.x)-pad <= x && x <= Math.max(a.x,b.x)+pad &&
                        Math.min(a.y,b.y)-pad <= y && y <= Math.max(a.y,b.y)+pad;
          if (inBox && dist < pad) return s.id;
        } else if (s.t === ToolType.Rect) {
          const a = toPx(s.a), b = toPx(s.b); if (!a || !b) continue;
          const Lx = Math.min(a.x,b.x), Rx = Math.max(a.x,b.x), Ty = Math.min(a.y,b.y), By = Math.max(a.y,b.y);
          if (x>=Lx && x<=Rx && y>=Ty && y<=By) return s.id;
        } else {
          const c = toPx(s.c), e = toPx(s.e); if (!c || !e) continue;
          const r = Math.hypot(e.x - c.x, e.y - c.y);
          const d = Math.hypot(x - c.x, y - c.y);
          if (Math.abs(d - r) < 8 || d < r) return s.id;
        }
      }
      return null;
    };
  
    return {
      logicalToX, xToLogical, priceToY, yToPrice,
      toPx, toPxWithCache, getPt,
      hitHandlePx, hitShapeIdAt,
    };
  }
  