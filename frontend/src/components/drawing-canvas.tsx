import React, { useEffect, useMemo, useRef } from 'react';
import { makeAutoObservable, autorun } from 'mobx';
import { observer } from 'mobx-react-lite';
import type {
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  Logical,
} from 'lightweight-charts';
import { ToolType } from './shared';

type DataPt = { logical: Logical; price: number };

type BaseShape = { id: string; stroke: string; width: number };
type LineShape = BaseShape & { t: 'Line'; a: DataPt; b: DataPt };
type RectShape = BaseShape & { t: 'Rect'; a: DataPt; b: DataPt };
type CircleShape = BaseShape & { t: 'Circle'; c: DataPt; e: DataPt };
type Shape = LineShape | RectShape | CircleShape;

type LogicalRange = { from: Logical; to: Logical };

const HANDLE_R = 6;
const PALETTE = ['#22d3ee', '#f59e0b', '#a78bfa', '#ef4444', '#10b981'];
const L = (n: number) => n as unknown as Logical;
const LN = (l: Logical) => l as unknown as number;

// ===== Store (MobX v6) =====
class DrawingStore {
  shapes: Shape[] = [];
  draft: Shape | null = null;
  selectedId: string | null = null;
  dirty = 0; // bump para repintar
  stroke = PALETTE[0];
  width = 2;

  constructor(public storageKey: string) {
    makeAutoObservable(this);
    this.load();
  }

  setStyle(stroke: string, width = 2) {
    this.stroke = stroke;
    this.width = width;
  }

  startDraft(tool: ToolType, p: DataPt) {
    const base = {
      id: crypto.randomUUID(),
      stroke: this.stroke,
      width: this.width,
    };
    if (tool === 'Line') this.draft = { ...base, t: 'Line', a: p, b: p };
    if (tool === 'Rect') this.draft = { ...base, t: 'Rect', a: p, b: p };
    if (tool === 'Circle') this.draft = { ...base, t: 'Circle', c: p, e: p };
    this.bump();
  }

  updateDraft(p: DataPt) {
    if (!this.draft) return;
    if (this.draft.t === 'Line') this.draft = { ...this.draft, b: p };
    if (this.draft.t === 'Rect') this.draft = { ...this.draft, b: p };
    if (this.draft.t === 'Circle') this.draft = { ...this.draft, e: p };
    this.bump();
  }

  commitDraft() {
    if (this.draft) {
      this.shapes.push(this.draft);
      this.draft = null;
      this.save();
      this.bump();
    }
  }

  select(id: string | null) {
    this.selectedId = id;
    this.bump();
  }

  moveSelected(dL: number, dP: number, snapshot?: Shape) {
    if (!this.selectedId || !snapshot) return;
    this.shapes = this.shapes.map((s) => {
      if (s.id !== this.selectedId) return s;
      const shift = (pt: DataPt): DataPt => ({
        logical: L(LN(pt.logical) + dL),
        price: pt.price + dP,
      });
      if (snapshot.t === 'Line')
        return {
          ...s,
          a: shift((snapshot as any).a),
          b: shift((snapshot as any).b),
        };
      if (snapshot.t === 'Rect')
        return {
          ...s,
          a: shift((snapshot as any).a),
          b: shift((snapshot as any).b),
        };
      if (snapshot.t === 'Circle')
        return {
          ...s,
          c: shift((snapshot as any).c),
          e: shift((snapshot as any).e),
        };
      return s;
    });
    this.bump();
  }

  replaceSelectedHandle(handle: 'a' | 'b' | 'c' | 'e', p: DataPt) {
    if (!this.selectedId) return;
    this.shapes = this.shapes.map((s) => {
      if (s.id !== this.selectedId) return s;
      if (s.t === 'Line' && (handle === 'a' || handle === 'b'))
        return { ...s, [handle]: p } as Shape;
      if (s.t === 'Rect' && handle === 'b') return { ...s, b: p } as Shape;
      if (s.t === 'Circle' && (handle === 'c' || handle === 'e'))
        return { ...s, [handle]: p } as Shape;
      return s;
    });
    this.save();
    this.bump();
  }

  Erase(id: string) {
    this.shapes = this.shapes.filter((s) => s.id !== id);
    this.save();
    this.bump();
  }

  // persistence
  save() {
    localStorage.setItem(
      `draw:${this.storageKey}`,
      JSON.stringify(this.shapes)
    );
  }
  load() {
    try {
      const raw = localStorage.getItem(`draw:${this.storageKey}`);
      if (!raw) return;
      const arr = JSON.parse(raw) as Shape[];
      if (Array.isArray(arr)) this.shapes = arr;
    } catch {}
  }

  bump() {
    this.dirty++;
  }
}

// ===== Component =====
type Props = {
  targetRef: React.RefObject<HTMLDivElement | null>;
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick'> | null;
  storageKey: string;
  tool: ToolType;
  onFinishDraw?: () => void;
};

const DrawingCanvas: React.FC<Props> = observer(
  ({ targetRef, chart, series, storageKey, tool, onFinishDraw }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const store = useMemo(() => new DrawingStore(storageKey), [storageKey]);

    // --- helpers de LWT v5
    const ts = () => chart?.timeScale();
    const logicalToX = (l: Logical): number | null =>
      ts()?.logicalToCoordinate(l) ?? null;
    const xToLogical = (x: number): Logical | null =>
      ts()?.coordinateToLogical(x) ?? null;
    const priceToY = (p: number): number | null =>
      series?.priceToCoordinate(p) ?? null;
    const yToPrice = (y: number): number | null =>
      series?.coordinateToPrice(y) ?? null;

    const visibleLogicalSafe = (): LogicalRange | null => {
      const scale = ts();
      if (!scale) return null;
      const lr = (scale as any).getVisibleLogicalRange?.();
      if (lr && lr.from != null && lr.to != null) return lr as LogicalRange;
      const tr = scale.getVisibleRange?.();
      if (!tr || tr.from == null || tr.to == null) return null;
      const xf = scale.timeToCoordinate(tr.from as UTCTimestamp);
      const xt = scale.timeToCoordinate(tr.to as UTCTimestamp);
      if (xf == null || xt == null) return null;
      const lf = scale.coordinateToLogical(xf);
      const lt = scale.coordinateToLogical(xt);
      if (lf == null || lt == null) return null;
      return { from: lf as Logical, to: lt as Logical };
    };

    const toPx = (d: DataPt): { x: number; y: number } | null => {
      const c = canvasRef.current;
      if (!c) return null;
      let x = logicalToX(d.logical);
      if (x == null) {
        const vr = visibleLogicalSafe();
        if (vr) {
          const from = LN(vr.from),
            to = LN(vr.to),
            l = LN(d.logical);
          x = l < from ? 0 : l > to ? c.clientWidth : null;
        }
      }
      const y = priceToY(d.price);
      if (x == null || y == null) return null;
      return { x, y };
    };

    // --- tamaño HiDPI
    useEffect(() => {
      const host = targetRef.current;
      const c = canvasRef.current;
      if (!host || !c) return;
      const resize = () => {
        const dpr = window.devicePixelRatio || 1,
          w = host.clientWidth,
          h = host.clientHeight;
        c.style.width = `${w}px`;
        c.style.height = `${h}px`;
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        redraw();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      resize();
      return () => ro.disconnect();
    }, [targetRef]);

    // --- repintar en: cambios de store, zoom/pan del chart, o tool
    useEffect(() => {
      const dispose = autorun(() => {
        void store.dirty;
        redraw();
      }); // se dispara cuando store cambia
      return () => dispose();
    }, [store]);

    useEffect(() => {
      redraw();
    }, [tool, chart, series]);

    useEffect(() => {
      if (!chart) return;
      const repaint = () => redraw();
      const scale = ts()!;
      scale.subscribeVisibleTimeRangeChange(repaint);
      (scale as any).subscribeVisibleLogicalRangeChange?.(repaint);
      return () => {
        scale.unsubscribeVisibleTimeRangeChange(repaint);
        (scale as any).unsubscribeVisibleLogicalRangeChange?.(repaint);
      };
    }, [chart]);

    // --- pintar
    const redraw = () => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;

      // clear HiDPI
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.restore();

      const drawShape = (s: Shape) => {
        ctx.lineWidth = s.width ?? 2;
        ctx.strokeStyle = s.stroke ?? PALETTE[0];
        if (s.t === 'Line') {
          const a = toPx(s.a),
            b = toPx(s.b);
          if (!a || !b) return;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        if (s.t === 'Rect') {
          const a = toPx(s.a),
            b = toPx(s.b);
          if (!a || !b) return;
          const x = Math.min(a.x, b.x),
            y = Math.min(a.y, b.y);
          const w = Math.abs(a.x - b.x),
            h = Math.abs(a.y - b.y);
          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.stroke();
        }
        if (s.t === 'Circle') {
          const cc = toPx(s.c),
            ee = toPx(s.e);
          if (!cc || !ee) return;
          const r = Math.hypot(ee.x - cc.x, ee.y - cc.y);
          ctx.beginPath();
          ctx.arc(cc.x, cc.y, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      };

      // figuras
      for (const s of store.shapes) drawShape(s);
      if (store.draft) drawShape(store.draft);

      // handles selección
      if (store.selectedId) {
        const s = store.shapes.find((s) => s.id === store.selectedId);
        if (s) {
          ctx.fillStyle = s.stroke ?? PALETTE[0];
          const push = (p: DataPt) => {
            const pt = toPx(p);
            if (!pt) return;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, HANDLE_R, 0, Math.PI * 2);
            ctx.fill();
          };
          if (s.t === 'Line') {
            push(s.a);
            push(s.b);
          }
          if (s.t === 'Rect') {
            push(s.a);
            push(s.b);
          }
          if (s.t === 'Circle') {
            push(s.c);
            push(s.e);
          }
        }
      }
    };

    // --- hit tests simples
    const hitShapeIdAt = (x: number, y: number): string | null => {
      const pad = 6;
      for (let i = store.shapes.length - 1; i >= 0; i--) {
        const s = store.shapes[i];
        if (s.t === 'Line') {
          const a = toPx(s.a),
            b = toPx(s.b);
          if (!a || !b) continue;
          const A = b.y - a.y,
            B = a.x - b.x,
            C = b.x * a.y - a.x * b.y;
          const dist = Math.abs(A * x + B * y + C) / Math.hypot(A, B);
          const inBox =
            Math.min(a.x, b.x) - pad <= x &&
            x <= Math.max(a.x, b.x) + pad &&
            Math.min(a.y, b.y) - pad <= y &&
            y <= Math.max(a.y, b.y) + pad;
          if (inBox && dist < pad) return s.id;
        }
        if (s.t === 'Rect') {
          const a = toPx(s.a),
            b = toPx(s.b);
          if (!a || !b) continue;
          const Lx = Math.min(a.x, b.x),
            Rx = Math.max(a.x, b.x);
          const Ty = Math.min(a.y, b.y),
            By = Math.max(a.y, b.y);
          if (x >= Lx && x <= Rx && y >= Ty && y <= By) return s.id;
        }
        if (s.t === 'Circle') {
          const c = toPx(s.c),
            e = toPx(s.e);
          if (!c || !e) continue;
          const r = Math.hypot(e.x - c.x, e.y - c.y);
          const d = Math.hypot(x - c.x, y - c.y);
          if (Math.abs(d - r) < 8 || d < r) return s.id;
        }
      }
      return null;
    };

    // --- pointer handlers (captura SOLO cuando tool !== 'None')
    const onPointerDown: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
      if (!chart || !series || tool === 'None') return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      const Rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - Rect.left,
        y = e.clientY - Rect.top;

      if (tool === 'Erase') {
        const id = hitShapeIdAt(x, y);
        if (id) store.Erase(id);
        return;
      }

      if (tool === 'Select') {
        const id = hitShapeIdAt(x, y);
        store.select(id ?? null);
        // Nota: en esta versión mínima NO hacemos pan; el chart no se mueve con select.
        return;
      }

      // draw tools
      const lg = xToLogical(x);
      const p = yToPrice(y);
      if (lg == null || p == null) return;
      store.startDraft(tool, { logical: lg, price: p });
    };

    const onPointerMove: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
      if (!chart || !series || tool === 'None') return;
      const Rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - Rect.left,
        y = e.clientY - Rect.top;

      if (store.draft) {
        const lg = xToLogical(x);
        const p = yToPrice(y);
        if (lg == null || p == null) return;
        store.updateDraft({ logical: lg, price: p });
        return;
      }

      if (tool === 'Select' && store.selectedId) {
        // mover por delta (simple: recomputamos delta sobre el cursor)
        // Tomamos pequeño delta respecto al último frame:
        const lg = xToLogical(x);
        const p = yToPrice(y);
        if (lg == null || p == null) return;
        // Para delta estable necesitaríamos snapshot en down; simplificado:
        // Aquí no movemos al vuelo para mantener la versión mínima.
      }
    };

    const onPointerUp: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
      if (!chart || !series || tool === 'None') return;
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      const wasDrawing = !!store.draft;
      store.commitDraft();
      if (wasDrawing) onFinishDraw?.();
    };

    return (
      <canvas
        ref={canvasRef}
        className={`draw-canvas ${tool !== 'None' ? 'active' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    );
  }
);

export default DrawingCanvas;
