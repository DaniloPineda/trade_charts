import React, { useEffect, useMemo, useRef } from 'react';
import { makeAutoObservable, autorun, toJS } from 'mobx';
import { observer } from 'mobx-react-lite';
import type {
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  Logical,
  Coordinate,
} from 'lightweight-charts';
import { ToolType } from './shared';

type DataPt = { logical: Logical; price: number };
type CursorCss = NonNullable<React.CSSProperties['cursor']>;
type BaseShape = { id: string; stroke: string; width: number };
type LineShape = BaseShape & { t: ToolType.Line; a: DataPt; b: DataPt };
type RectShape = BaseShape & { t: ToolType.Rect; a: DataPt; b: DataPt };
type CircleShape = BaseShape & { t: ToolType.Circle; c: DataPt; e: DataPt };
type Shape = LineShape | RectShape | CircleShape;

type LogicalRange = { from: Logical; to: Logical };

const HANDLE_R = 6;
const PALETTE = ['#22d3ee', '#f59e0b', '#a78bfa', '#ef4444', '#10b981'];
const L = (n: number) => n as unknown as Logical;
const LN = (l: Logical) => l as unknown as number;
const CN = (c: Coordinate): number => c as unknown as number;

class DrawingStore {
  shapes: Shape[] = [];
  draft: Shape | null = null;
  selectedId: string | null = null;
  dirty = 0;
  stroke = PALETTE[0];
  width = 2;
  hoverId: string | null = null;
  drawingsVisible = true;
  globalStroke = PALETTE[0];
  globalWidth = 2;

  constructor(public storageKey: string) {
    makeAutoObservable(this);
    this.load();
  }

  setGlobalStyle(partial: { stroke?: string; width?: number }) {
    if (partial.stroke) this.globalStroke = partial.stroke;
    if (partial.width) this.globalWidth = partial.width;
    this.stroke = this.globalStroke;
    this.width = this.globalWidth;
    this.bump();
  }

  updateDraftStyle(partial: { stroke?: string; width?: number }) {
    if (!this.draft) return;
    this.draft = { ...this.draft, ...partial } as Shape;
    this.bump(); // no guardes aquí; el draft se persiste en commitDraft()
  }

  toggleVisibility() {
    this.drawingsVisible = !this.drawingsVisible;
    this.bump();
  }

  updateSelectedStyle(partial: { stroke?: string; width?: number }) {
    // NEW
    if (!this.selectedId) return;
    this.shapes = this.shapes.map((s) =>
      s.id === this.selectedId ? ({ ...s, ...partial } as Shape) : s
    );
    this.save();
    this.bump();
  }

  setHover(id: string | null) {
    this.hoverId = id;
    this.bump(); // fuerza repintado
  }

  startDraft(tool: ToolType, p: DataPt) {
    const base = {
      id: crypto.randomUUID(),
      stroke: this.globalStroke,
      width: this.globalWidth,
    };
    if (tool === ToolType.Line)
      this.draft = { ...base, t: ToolType.Line, a: p, b: p };
    if (tool === ToolType.Rect)
      this.draft = { ...base, t: ToolType.Rect, a: p, b: p };
    if (tool === ToolType.Circle)
      this.draft = { ...base, t: ToolType.Circle, c: p, e: p };
    this.bump();
  }

  updateDraft(p: DataPt) {
    if (!this.draft) return;
    if (this.draft.t === ToolType.Line) this.draft = { ...this.draft, b: p };
    if (this.draft.t === ToolType.Rect) this.draft = { ...this.draft, b: p };
    if (this.draft.t === ToolType.Circle) this.draft = { ...this.draft, e: p };
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
      if (snapshot.t === ToolType.Line)
        return {
          ...s,
          a: shift((snapshot as any).a),
          b: shift((snapshot as any).b),
        };
      if (snapshot.t === ToolType.Rect)
        return {
          ...s,
          a: shift((snapshot as any).a),
          b: shift((snapshot as any).b),
        };
      if (snapshot.t === ToolType.Circle)
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
      if (s.t === ToolType.Line && (handle === 'a' || handle === 'b'))
        return { ...s, [handle]: p } as Shape;
      if (s.t === ToolType.Rect && (handle === 'a' || handle === 'b'))
        return { ...s, [handle]: p } as Shape;
      if (s.t === ToolType.Circle && (handle === 'c' || handle === 'e'))
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
    const isValid = (s: any): s is Shape => {
      if (!s || !s.t || !s.id) return false;
      const okPt = (p: any) =>
        p && p.logical != null && typeof p.price === 'number';
      if (s.t === 'Line' || s.t === 'Rect') return okPt(s.a) && okPt(s.b);
      if (s.t === 'Circle') return okPt(s.c) && okPt(s.e);
      return false;
    };
    try {
      const raw = localStorage.getItem(`draw:${this.storageKey}`);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) this.shapes = arr.filter(isValid);
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
  drawingColor?: string;
  drawingWidth?: number;
  drawingsVisible?: boolean;
  onFinishDraw?: () => void;
  onSetTool?: (t: ToolType) => void;
};

const DrawingCanvas: React.FC<Props> = observer(
  ({
    targetRef,
    chart,
    series,
    storageKey,
    tool,
    drawingColor,
    drawingWidth,
    drawingsVisible,
    onFinishDraw,
    onSetTool,
  }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const dragRef = useRef<{
      mode: 'move' | 'handle' | null;
      id: string | null;
      handle?: 'a' | 'b' | 'c' | 'e';
      startCursor?: DataPt;
      snapshot?: Shape;
    }>({ mode: null, id: null });
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

    const isScalingRef = useRef(false);
    const pxCache = useRef<Map<string, { x: number; y: number }>>(new Map());
    const bufferRef = useRef<HTMLCanvasElement | null>(null);
    let rafId: number | null = null;

    const scheduleRedraw = () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        redraw();
      });
    };

    // add inside component
    const onCanvasContextMenu: React.MouseEventHandler<HTMLCanvasElement> = (
      e
    ) => {
      // permitir borrar en None o Select (ajusta si quieres en cualquier modo)
      e.preventDefault();
      const allow = tool === ToolType.None || tool === ToolType.Select;

      // posición relativa al canvas
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // si estabas dibujando, usa right-click como "cancel draft"
      if (store.draft) {
        e.preventDefault();
        store.draft = null;
        store.bump();
        setCursor('default');
        return;
      }

      // borrar figura si hay una debajo
      const id = hitShapeIdAt(x, y);
      if (allow && id) {
        e.preventDefault(); // bloquea menú nativo SOLO si borramos
        store.Erase(id);
        store.select(null);
        setCursor('default');
      }
      // si no hay figura, dejamos que salga el menú del navegador
    };

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

    const getPt = (s: Shape, key: 'a' | 'b' | 'c' | 'e'): DataPt | null => {
      const v = (s as any)[key];
      if (!v || v.logical == null || typeof v.price !== 'number') return null;
      return v as DataPt;
    };

    const toPxWithCache = (
      shapeId: string,
      key: 'a' | 'b' | 'c' | 'e',
      d: DataPt | null | undefined
    ): { x: number; y: number } | null => {
      const c = canvasRef.current;
      if (!c || !d || d.logical == null || typeof d.price !== 'number')
        return null;

      // X
      let x: number | null = null;
      const cx = ts()?.logicalToCoordinate(d.logical);
      x = cx != null ? CN(cx) : null;
      if (x == null) {
        const vr = visibleLogicalSafe();
        if (vr) {
          const from = LN(vr.from),
            to = LN(vr.to),
            l = LN(d.logical);
          x = l < from ? 0 : l > to ? c.clientWidth : null;
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

    useEffect(() => {
      if (!chart) return;
      const ts = chart.timeScale();
      let tm: any;

      const onRange = () => {
        isScalingRef.current = true;
        scheduleRedraw();
        clearTimeout(tm);
        tm = setTimeout(() => {
          isScalingRef.current = false;
          scheduleRedraw();
        }, 120); // un pelín más largo para figuras grandes
      };

      ts.subscribeVisibleTimeRangeChange(onRange);
      (ts as any).subscribeVisibleLogicalRangeChange?.(onRange);
      return () => {
        clearTimeout(tm);
        ts.unsubscribeVisibleTimeRangeChange(onRange);
        (ts as any).unsubscribeVisibleLogicalRangeChange?.(onRange);
      };
    }, [chart]);

    useEffect(() => {
      const host = targetRef.current;
      const c = canvasRef.current;
      if (!host || !c) return;

      const ensureBufferSize = (w: number, h: number, dpr: number) => {
        if (!bufferRef.current)
          bufferRef.current = document.createElement('canvas');
        const buf = bufferRef.current;
        if (
          buf.width !== Math.round(w * dpr) ||
          buf.height !== Math.round(h * dpr)
        ) {
          buf.width = Math.round(w * dpr);
          buf.height = Math.round(h * dpr);
        }
      };

      const resize = () => {
        const dpr = window.devicePixelRatio || 1,
          w = host.clientWidth,
          h = host.clientHeight;
        c.style.width = `${w}px`;
        c.style.height = `${h}px`;
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
        const ctx = c.getContext('2d');
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ensureBufferSize(w, h, dpr);
        scheduleRedraw();
      };

      const ro = new ResizeObserver(resize);
      ro.observe(host);
      resize();
      pxCache.current.clear();
      return () => ro.disconnect();
    }, [targetRef]);

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

    useEffect(() => {
      const host = targetRef.current;
      if (!host || !chart || !series) return;

      const getXY = (ev: PointerEvent) => {
        const rect = (canvasRef.current ?? host).getBoundingClientRect();
        return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      };

      // --- HOVER (siempre activo para pintar aura y cursor del host en None)
      const onMoveHover = (ev: PointerEvent) => {
        const { x, y } = getXY(ev);
        const id = hitShapeIdAt(x, y);
        store.setHover(id ?? null);
        if (tool === ToolType.None) setCursor(id ? 'pointer' : 'default');
      };

      const onLeave = () => {
        store.setHover(null);
        if (tool === ToolType.None) setCursor('default');
      };

      // --- DRAG desde None: si hay hover y comienzas a arrastrar, agarramos la figura
      const onDownFromNone = (ev: PointerEvent) => {
        if (tool !== ToolType.None) return;
        const { x, y } = getXY(ev);
        const id = hitShapeIdAt(x, y);
        if (!id) return;

        // Bloquea pan del chart y captura el puntero en el host
        ev.preventDefault();
        (host as any).setPointerCapture?.(ev.pointerId);

        // Selecciona y arranca drag (move) con snapshot plano (toJS)
        store.select(id);
        const lg = xToLogical(x),
          p = yToPrice(y);
        if (lg == null || p == null) return;
        const snapshot = toJS(store.shapes.find((s) => s.id === id)!) as Shape;

        dragRef.current = {
          mode: 'move',
          id,
          startCursor: { logical: lg, price: p },
          snapshot,
        };

        // Activa Select para que el overlay quede activo; cursor de “grabbing”
        onSetTool?.(ToolType.Select);
        setCursor('grabbing');
      };

      const onMoveDragFromNone = (ev: PointerEvent) => {
        // Solo si iniciamos un drag desde None (ya estamos en Select por onDown)
        if (tool !== ToolType.Select || dragRef.current.mode !== 'move') return;
        const { x, y } = getXY(ev);
        const lg = xToLogical(x),
          p = yToPrice(y);
        if (lg == null || p == null) return;
        const start = dragRef.current.startCursor;
        const snap = dragRef.current.snapshot;
        if (!start || !snap) return;

        const dL = LN(lg) - LN(start.logical);
        const dP = p - start.price;
        store.moveSelected(dL, dP, snap);
        setCursor('grabbing'); // mantener cursor
      };

      const onUpDragFromNone = (ev: PointerEvent) => {
        if (dragRef.current.mode !== 'move') return;
        (host as any).releasePointerCapture?.(ev.pointerId);
        store.save();
        dragRef.current = { mode: null, id: null };
        // Restituye cursor acorde a hover actual
        if (tool === ToolType.Select) {
          setCursor(store.hoverId ? 'pointer' : 'default');
        } else {
          setCursor('default');
        }
      };

      // Listeners (fase capture para ir antes que el chart)
      host.addEventListener('pointermove', onMoveHover, true);
      host.addEventListener('pointerleave', onLeave, true);
      host.addEventListener('pointerdown', onDownFromNone, true);
      host.addEventListener('pointermove', onMoveDragFromNone, true);
      window.addEventListener('pointerup', onUpDragFromNone, true);

      return () => {
        host.removeEventListener('pointermove', onMoveHover, true);
        host.removeEventListener('pointerleave', onLeave, true);
        host.removeEventListener('pointerdown', onDownFromNone, true);
        host.removeEventListener('pointermove', onMoveDragFromNone, true);
        window.removeEventListener('pointerup', onUpDragFromNone, true);
        host.style.cursor = '';
      };
    }, [targetRef, chart, series, tool, onSetTool]);

    // Right-click delete (and Ctrl+Click on Mac)
    useEffect(() => {
      const host = targetRef.current;
      if (!host || !chart || !series) return;

      const getXY = (ev: MouseEvent | PointerEvent) => {
        const rect = (canvasRef.current ?? host).getBoundingClientRect();
        return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      };

      const tryDelete = (x: number, y: number, ev: Event) => {
        // Solo en None o Select, y si no estás arrastrando
        if (tool !== ToolType.None && tool !== ToolType.Select) return;
        if ((dragRef as any)?.current?.mode) return;
        if (store.drawingsVisible === false) return;

        const id = hitShapeIdAt(x, y);
        if (!id) return; // nada debajo → deja el menú nativo

        ev.preventDefault(); // bloquea el menú
        ev.stopPropagation();
        store.Erase(id);
        store.select(null);
        setCursor(
          tool === ToolType.None
            ? 'default'
            : store.hoverId
              ? 'pointer'
              : 'default'
        );
      };

      // Botón derecho (button===2) o Ctrl+Click (button===0 + ctrlKey) → borrar
      const onPointerDown = (ev: PointerEvent) => {
        if (ev.button === 2 || (ev.button === 0 && ev.ctrlKey)) {
          const el = ev.currentTarget as HTMLCanvasElement;
          const rect = el?.getBoundingClientRect?.();
          const x = ev.clientX - rect.left,
            y = ev.clientY - rect.top;

          // opcional: no borres si los dibujos están ocultos
          // if (store.drawingsVisible === false) return;

          const id = hitShapeIdAt(x, y);
          if ((tool === ToolType.None || tool === ToolType.Select) && id) {
            ev.preventDefault();
            store.Erase(id);
            store.select(null);
            setCursor('default');
            return; // salimos, no seguimos con la lógica de dibujo/selección
          }
        }
        const isRightClick = ev.button === 2;
        const isCtrlClick = ev.button === 0 && ev.ctrlKey;
        if (!isRightClick && !isCtrlClick) return;
        const { x, y } = getXY(ev);
        tryDelete(x, y, ev);
      };

      // Fallback por si algún navegador solo dispara contextmenu
      const onContext = (ev: MouseEvent) => {
        const { x, y } = getXY(ev);
        tryDelete(x, y, ev);
      };

      // useCapture=true para adelantarnos al chart
      host.addEventListener('pointerdown', onPointerDown, true);
      host.addEventListener('contextmenu', onContext, true);

      return () => {
        host.removeEventListener('pointerdown', onPointerDown, true);
        host.removeEventListener('contextmenu', onContext, true);
      };
    }, [targetRef, chart, series, tool, store.drawingsVisible]);

    useEffect(() => {
      const host = targetRef.current;
      if (!host || !chart || !series) return;

      const onDown = (ev: PointerEvent) => {
        if (tool !== 'None') return;
        const rect = (canvasRef.current ?? host).getBoundingClientRect();
        const x = ev.clientX - rect.left,
          y = ev.clientY - rect.top;
        const id = hitShapeIdAt(x, y);
        if (id) {
          store.select(id);
          onSetTool?.(ToolType.Select);
        }
      };

      host.addEventListener('pointerdown', onDown, true);
      return () => host.removeEventListener('pointerdown', onDown, true);
    }, [targetRef, chart, series, tool, onSetTool]);

    useEffect(() => {
      const stroke = drawingColor ?? store.globalStroke;
      const width = drawingWidth ?? store.globalWidth;

      // 1) Selected: solo si cambia
      if (store.selectedId) {
        const sel = store.shapes.find((s) => s.id === store.selectedId);
        if (
          sel &&
          ((stroke && sel.stroke !== stroke) || (width && sel.width !== width))
        ) {
          store.updateSelectedStyle({ stroke, width });
        }
      }

      // 2) Draft: solo si cambia
      if (
        store.draft &&
        ((stroke && store.draft.stroke !== stroke) ||
          (width && store.draft.width !== width))
      ) {
        store.updateDraftStyle({ stroke, width });
      }

      // 3) Defaults: solo si cambia
      if (store.globalStroke !== stroke || store.globalWidth !== width) {
        store.setGlobalStyle({ stroke, width });
      }
    }, [drawingColor, drawingWidth, store.selectedId]);

    useEffect(() => {
      if (typeof drawingsVisible === 'boolean') {
        store.drawingsVisible = drawingsVisible;
        store.bump();
      }
    }, [drawingsVisible]);

    useEffect(() => {
      const dispose = autorun(() => {
        void store.dirty;
        pxCache.current.clear();
        scheduleRedraw();
      });
      return () => dispose();
    }, [store]);

    useEffect(() => {
      scheduleRedraw();
    }, [tool, chart, series]);

    useEffect(() => {
      if (tool === ToolType.None) return setCursor('default');
      if (tool === ToolType.Erase) return setCursor('not-allowed');
      if (tool === ToolType.Select)
        return setCursor(
          store.hoverId || store.selectedId ? 'pointer' : 'default'
        );
      // Line / Rect / Circle
      return setCursor('crosshair');
    }, [tool, store.hoverId, store.selectedId]);

    // y donde antes llamabas `redraw()` por tool/serie, usa `scheduleRedraw()`
    useEffect(() => {
      scheduleRedraw();
    }, [tool, chart, series]);

    const canLayoutAll = (): boolean => {
      for (const s of store.shapes) {
        if (s.t === 'Line') {
          const a = getPt(s, 'a'),
            b = getPt(s, 'b');
          if (!a || !b) return false;
          if (!toPxWithCache(s.id, 'a', a) || !toPxWithCache(s.id, 'b', b))
            return false;
        } else if (s.t === 'Rect') {
          const a = getPt(s, 'a'),
            b = getPt(s, 'b');
          if (!a || !b) return false;
          if (!toPxWithCache(s.id, 'a', a) || !toPxWithCache(s.id, 'b', b))
            return false;
        } else {
          // Circle
          const c = getPt(s, 'c'),
            e = getPt(s, 'e');
          if (!c || !e) return false;
          if (!toPxWithCache(s.id, 'c', c) || !toPxWithCache(s.id, 'e', e))
            return false;
        }
      }
      if (store.draft) {
        const d = store.draft as any;
        const keys =
          d.t === 'Circle' ? (['c', 'e'] as const) : (['a', 'b'] as const);
        for (const k of keys) {
          const p = getPt(d, k);
          if (!p || !toPxWithCache(d.id, k, p)) return false;
        }
      }
      return true;
    };

    const redraw = () => {
      const c = canvasRef.current,
        buf = bufferRef.current;
      if (!c || !buf) return;
      const ctx = c.getContext('2d')!,
        bctx = buf.getContext('2d')!;
      const dpr = window.devicePixelRatio || 1;

      // Si estamos escalando y aún faltan coordenadas, NO borres: blitea el último buffer
      if (isScalingRef.current && !canLayoutAll()) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(buf, 0, 0); // frame anterior
        return;
      }

      // Limpiar y dibujar al BUFFER primero
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.clearRect(0, 0, buf.width, buf.height);
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const drawCtx = bctx; // usamos drawCtx en lugar de ctx dentro del dibujo

      const drawShape = (s: Shape) => {
        drawCtx.lineWidth = s.width ?? 2;
        drawCtx.strokeStyle = s.stroke ?? PALETTE[0];
        if (s.t === 'Line') {
          const a = toPxWithCache(s.id, 'a', getPt(s, 'a'));
          const b = toPxWithCache(s.id, 'b', getPt(s, 'b'));

          if (!a || !b) return;
          // hover outline…
          if (store.hoverId === s.id && store.selectedId !== s.id) {
            drawCtx.save();
            drawCtx.lineWidth = (s.width ?? 2) + 4;
            drawCtx.strokeStyle = 'rgba(255,255,255,0.35)';
            drawCtx.beginPath();
            drawCtx.moveTo(a.x, a.y);
            drawCtx.lineTo(b.x, b.y);
            drawCtx.stroke();
            drawCtx.restore();
          }
          drawCtx.beginPath();
          drawCtx.moveTo(a.x, a.y);
          drawCtx.lineTo(b.x, b.y);
          drawCtx.stroke();
        }
        if (s.t === 'Rect') {
          const a = toPxWithCache(s.id, 'a', getPt(s, 'a'));
          const b = toPxWithCache(s.id, 'b', getPt(s, 'b'));
          if (!a || !b) return;
          const x = Math.min(a.x, b.x),
            y = Math.min(a.y, b.y),
            w = Math.abs(a.x - b.x),
            h = Math.abs(a.y - b.y);
          if (store.hoverId === s.id && store.selectedId !== s.id) {
            drawCtx.save();
            drawCtx.lineWidth = (s.width ?? 2) + 4;
            drawCtx.strokeStyle = 'rgba(255,255,255,0.35)';
            drawCtx.beginPath();
            drawCtx.rect(x, y, w, h);
            drawCtx.stroke();
            drawCtx.restore();
          }
          drawCtx.beginPath();
          drawCtx.rect(x, y, w, h);
          drawCtx.stroke();
        }
        if (s.t === 'Circle') {
          const cc = toPxWithCache(s.id, 'c', getPt(s, 'c'));
          const ee = toPxWithCache(s.id, 'e', getPt(s, 'e'));
          if (!cc || !ee) return;
          const r = Math.hypot(ee.x - cc.x, ee.y - cc.y);
          if (store.hoverId === s.id && store.selectedId !== s.id) {
            drawCtx.save();
            drawCtx.lineWidth = (s.width ?? 2) + 4;
            drawCtx.strokeStyle = 'rgba(255,255,255,0.35)';
            drawCtx.beginPath();
            drawCtx.arc(cc.x, cc.y, r, 0, Math.PI * 2);
            drawCtx.stroke();
            drawCtx.restore();
          }
          drawCtx.beginPath();
          drawCtx.arc(cc.x, cc.y, r, 0, Math.PI * 2);
          drawCtx.stroke();
        }
      };

      for (const s of store.shapes) drawShape(s);
      if (store.draft) drawShape(store.draft);

      // handles
      if (store.selectedId) {
        const s = store.shapes.find((x) => x.id === store.selectedId);
        if (s) {
          drawCtx.fillStyle = s.stroke ?? PALETTE[0];
          const push = (p: DataPt | null, key: 'a' | 'b' | 'c' | 'e') => {
            if (!p) return;
            const pt = toPxWithCache(s.id, key, p);
            if (!pt) return;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, HANDLE_R, 0, Math.PI * 2);
            ctx.fill();
          };
          if (s.t === 'Line') {
            push(s.a, 'a');
            push(s.b, 'b');
          }
          if (s.t === 'Rect') {
            push(s.a, 'a');
            push(s.b, 'b');
          }
          if (s.t === 'Circle') {
            push(s.c, 'c');
            push(s.e, 'e');
          }
        }
      }

      // Presentar el buffer → pantalla (sin tearing)
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(buf, 0, 0);
    };

    // --- hit tests simples
    const hitShapeIdAt = (x: number, y: number): string | null => {
      const pad = 6;
      for (let i = store.shapes.length - 1; i >= 0; i--) {
        const s = store.shapes[i];
        if (s.t === ToolType.Line) {
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
        if (s.t === ToolType.Rect) {
          const a = toPx(s.a),
            b = toPx(s.b);
          if (!a || !b) continue;
          const Lx = Math.min(a.x, b.x),
            Rx = Math.max(a.x, b.x);
          const Ty = Math.min(a.y, b.y),
            By = Math.max(a.y, b.y);
          if (x >= Lx && x <= Rx && y >= Ty && y <= By) return s.id;
        }
        if (s.t === ToolType.Circle) {
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

    const handles = (
      s: Shape
    ): { x: number; y: number; name: 'a' | 'b' | 'c' | 'e' }[] => {
      const hs: any[] = [];
      if (s.t === ToolType.Line) {
        const a = toPx(s.a),
          b = toPx(s.b);
        if (a && b) {
          hs.push({ ...a, name: 'a' });
          hs.push({ ...b, name: 'b' });
        }
      }
      if (s.t === ToolType.Rect) {
        const a = toPx(s.a),
          b = toPx(s.b);
        if (a && b) {
          hs.push({ ...a, name: 'a' });
          hs.push({ ...b, name: 'b' });
        }
      }
      if (s.t === ToolType.Circle) {
        const c = toPx(s.c),
          e = toPx(s.e);
        if (c && e) {
          hs.push({ ...c, name: 'c' });
          hs.push({ ...e, name: 'e' });
        }
      }
      return hs;
    };

    const hitHandlePx = (
      x: number,
      y: number
    ): { id: string; name: 'a' | 'b' | 'c' | 'e' } | null => {
      if (!store.selectedId) return null;
      const s = store.shapes.find((sh) => sh.id === store.selectedId);
      if (!s) return null;
      for (const h of handles(s))
        if (Math.hypot(h.x - x, h.y - y) <= HANDLE_R + 2)
          return { id: s.id, name: h.name };
      return null;
    };

    const setCursor = (c: CursorCss) => {
      if (canvasRef.current) canvasRef.current.style.cursor = c;
      if (targetRef.current) targetRef.current.style.cursor = c;
    };

    const getResizeCursorForRect = (): CursorCss => {
      const s =
        store.selectedId && store.shapes.find((x) => x.id === store.selectedId);
      if (!s || s.t !== 'Rect') return 'nwse-resize';
      const a = toPx(s.a),
        b = toPx(s.b);
      if (!a || !b) return 'nwse-resize';
      const diagNWSE = (a.x < b.x && a.y < b.y) || (a.x > b.x && a.y > b.y);
      return diagNWSE ? 'nwse-resize' : 'nesw-resize';
    };

    // --- pointer handlers (captura SOLO cuando tool !== 'None')
    const onPointerDown: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
      if (!chart || !series || tool === 'None') return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      const Rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - Rect.left,
        y = e.clientY - Rect.top;

      if (tool === ToolType.Erase) {
        const id = hitShapeIdAt(x, y);
        if (id) store.Erase(id);
        return;
      }

      if (tool === ToolType.Select) {
        const Rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - Rect.left,
          y = e.clientY - Rect.top;

        const hh = hitHandlePx(x, y);
        const id = hh ? hh.id : hitShapeIdAt(x, y);

        if (hh) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          store.select(hh.id);
          dragRef.current = { mode: 'handle', id: hh.id, handle: hh.name };
          setCursor(getResizeCursorForRect());
          return;
        }

        if (id) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          store.select(id);
          const lg = xToLogical(x),
            p = yToPrice(y);
          if (lg == null || p == null) return;
          // ⚠️ snapshot PLAIN con toJS (evita DataCloneError)
          const snapshot = toJS(
            store.shapes.find((s) => s.id === id)!
          ) as Shape;
          dragRef.current = {
            mode: 'move',
            id,
            startCursor: { logical: lg, price: p },
            snapshot,
          };
          setCursor('grabbing');
          return;
        }

        // click fuera ⇒ deseleccionar y volver a None
        store.select(null);
        onSetTool?.(ToolType.None);
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
        const lg = xToLogical(x),
          p = yToPrice(y);
        if (lg == null || p == null) return;
        store.updateDraft({ logical: lg, price: p });
        return;
      }

      if (tool === ToolType.Select && !dragRef.current.mode) {
        const overHandle = hitHandlePx(x, y);
        if (overHandle) {
          setCursor(getResizeCursorForRect());
        } else if (store.hoverId) {
          setCursor('pointer');
        } else {
          setCursor('default');
        }
      }

      if (tool === ToolType.Select) {
        if (
          dragRef.current.mode === 'move' &&
          dragRef.current.startCursor &&
          dragRef.current.snapshot
        ) {
          e.preventDefault();
          const lg = xToLogical(x),
            p = yToPrice(y);
          if (lg == null || p == null) return;
          const dL = LN(lg) - LN(dragRef.current.startCursor.logical);
          const dP = p - dragRef.current.startCursor.price;
          store.moveSelected(dL, dP, dragRef.current.snapshot);
          setCursor('grabbing');
          return;
        }
        if (dragRef.current.mode === 'handle' && dragRef.current.handle) {
          e.preventDefault();
          const lg = xToLogical(x),
            p = yToPrice(y);
          if (lg == null || p == null) return;
          store.replaceSelectedHandle(dragRef.current.handle, {
            logical: lg,
            price: p,
          });
          setCursor(getResizeCursorForRect());
          return;
        }
      }
    };

    const onPointerUp: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
      if (!chart || !series || tool === 'None') return;

      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);

      // end move/resize
      if (dragRef.current.mode) {
        store.save();
        dragRef.current = { mode: null, id: null };
        // restaurar cursor según estado actual
        if (tool === ToolType.Select) {
          setCursor(store.hoverId ? 'pointer' : 'default');
        } else if (tool === ToolType.Erase) {
          setCursor('not-allowed');
        } else {
          setCursor('crosshair'); // line/rect/circle
        }
        return;
      }

      // end drawing
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
        onContextMenu={onCanvasContextMenu}
      />
    );
  }
);

export default DrawingCanvas;
