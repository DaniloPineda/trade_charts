import React, { useEffect, useMemo, useRef } from 'react';
import { autorun, toJS } from 'mobx';
import { observer } from 'mobx-react-lite';
import type {
  IChartApi,
  ISeriesApi,
  ITimeScaleApi,
  Time,
} from 'lightweight-charts';
import { ToolType } from '../shared'; // 👈 ajusta

import { DrawingStore } from './drawing-store';
import { CursorCss, DataPt, LN } from './drawing-types';
import { makeGeometryUtils } from './drawing-geometry';
import { makeRenderer } from './drawing-render';

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
    const bufferRef = useRef<HTMLCanvasElement | null>(null);

    const toolRef = useRef(tool);
    useEffect(() => {
      toolRef.current = tool;
    }, [tool]);

    const dragRef = useRef<{
      mode: 'move' | 'handle' | null;
      id: string | null;
      handle?: 'a' | 'b' | 'c' | 'e';
      startCursor?: DataPt;
      snapshot?: any;
    }>({ mode: null, id: null });

    const store = useMemo(() => new DrawingStore(storageKey), [storageKey]);

    // LWT v5 time scale
    const tsApi: ITimeScaleApi<Time> | null = chart?.timeScale() ?? null;

    const isScalingRef = useRef(false);
    const pxCache = useRef<Map<string, { x: number; y: number }>>(new Map());

    const geo = useMemo(
      () =>
        tsApi
          ? makeGeometryUtils({
              ts: tsApi,
              series,
              getCanvas: () => canvasRef.current,
              isScalingRef,
              pxCache,
            })
          : null,
      [tsApi, series]
    );

    let rafId: number | null = null;
    const scheduleRedraw = () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        renderer?.redraw();
      });
    };

    // tamaño + buffer
    useEffect(() => {
      const host = targetRef.current,
        c = canvasRef.current;
      if (!host || !c) return;
      if (!bufferRef.current)
        bufferRef.current = document.createElement('canvas');

      const ensureBufferSize = (w: number, h: number, dpr: number) => {
        const buf = bufferRef.current!;
        const W = Math.round(w * dpr),
          H = Math.round(h * dpr);
        if (buf.width !== W || buf.height !== H) {
          buf.width = W;
          buf.height = H;
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
        c.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
        ensureBufferSize(w, h, dpr);
        pxCache.current.clear();
        scheduleRedraw();
      };

      const ro = new ResizeObserver(resize);
      ro.observe(host);
      resize();
      return () => ro.disconnect();
    }, [targetRef]);

    // smoothing zoom/pan
    useEffect(() => {
      if (!chart) return;
      const scale = chart.timeScale();
      let tm: any;
      const onRange = () => {
        isScalingRef.current = true;
        scheduleRedraw();
        clearTimeout(tm);
        tm = setTimeout(() => {
          isScalingRef.current = false;
          scheduleRedraw();
        }, 120);
      };
      scale.subscribeVisibleTimeRangeChange(onRange);
      (scale as any).subscribeVisibleLogicalRangeChange?.(onRange);
      return () => {
        clearTimeout(tm);
        scale.unsubscribeVisibleTimeRangeChange(onRange);
        (scale as any).unsubscribeVisibleLogicalRangeChange?.(onRange);
      };
    }, [chart]);

    // autorun -> redraw
    useEffect(() => {
      const dispose = autorun(() => {
        void store.dirty;
        pxCache.current.clear();
        scheduleRedraw();
      });
      return () => dispose();
    }, [store]);

    // visibility
    useEffect(() => {
      if (typeof drawingsVisible === 'boolean') {
        store.drawingsVisible = drawingsVisible;
        store.bump();
      }
    }, [drawingsVisible]);

    // estilos
    useEffect(() => {
      const stroke = drawingColor ?? store.globalStroke;
      const width = drawingWidth ?? store.globalWidth;

      if (store.selectedId) {
        const sel = store.shapes.find((s) => s.id === store.selectedId);
        if (
          sel &&
          ((stroke && sel.stroke !== stroke) || (width && sel.width !== width))
        ) {
          store.updateSelectedStyle({ stroke, width });
        }
      }
      if (
        store.draft &&
        ((stroke && store.draft.stroke !== stroke) ||
          (width && store.draft.width !== width))
      ) {
        store.updateDraftStyle({ stroke, width });
      }
      if (store.globalStroke !== stroke || store.globalWidth !== width) {
        store.setGlobalStyle({ stroke, width });
      }
    }, [drawingColor, drawingWidth, store.selectedId]);

    // renderer
    const renderer = useMemo(() => {
      const c = canvasRef.current,
        b = bufferRef.current;
      if (!c || !b || !geo) return null;

      const canLayoutAll = (): boolean => {
        for (const s of store.shapes) {
          if (s.t === ToolType.Line || s.t === ToolType.Rect) {
            const a = geo.getPt(s, 'a'),
              b2 = geo.getPt(s, 'b');
            if (!a || !b2) return false;
            if (
              !geo.toPxWithCache(s.id, 'a', a) ||
              !geo.toPxWithCache(s.id, 'b', b2)
            )
              return false;
          } else {
            const c2 = geo.getPt(s, 'c'),
              e2 = geo.getPt(s, 'e');
            if (!c2 || !e2) return false;
            if (
              !geo.toPxWithCache(s.id, 'c', c2) ||
              !geo.toPxWithCache(s.id, 'e', e2)
            )
              return false;
          }
        }
        if (store.draft) {
          const d: any = store.draft;
          const ks = d.t === ToolType.Circle ? ['c', 'e'] : ['a', 'b'];
          for (const k of ks) {
            const p = geo.getPt(d, k as any);
            if (!p || !geo.toPxWithCache(d.id, k as any, p)) return false;
          }
        }
        return true;
      };

      return makeRenderer({
        store,
        canvas: c,
        buffer: b,
        isScalingRef,
        canLayoutAll,
        toPxWithCache: geo.toPxWithCache,
        getPt: geo.getPt,
      });
    }, [geo, store]);

    useEffect(() => {
      renderer && renderer.redraw();
    }, [renderer]);

    // cursor
    const setCursor = (c: CursorCss) => {
      if (canvasRef.current) canvasRef.current.style.cursor = c;
      if (targetRef.current) targetRef.current.style.cursor = c;
    };
    useEffect(() => {
      if (tool === ToolType.None) return setCursor('default');
      if (tool === ToolType.Erase) return setCursor('not-allowed');
      if (tool === ToolType.Select)
        return setCursor(
          store.hoverId || store.selectedId ? 'pointer' : 'default'
        );
      return setCursor('crosshair');
    }, [tool, store.hoverId, store.selectedId]);

    // hover y drag-from-None (host-level, estable)
    useEffect(() => {
      const host = targetRef.current;
      if (!host || !chart || !series || !geo) return;
      const getXY = (ev: PointerEvent) => {
        const rect = (canvasRef.current ?? host).getBoundingClientRect();
        return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      };

      const onMoveHover = (ev: PointerEvent) => {
        const { x, y } = getXY(ev);
        const id = geo.hitShapeIdAt(x, y, store.shapes);
        store.setHover(id ?? null);
        if (toolRef.current === ToolType.None)
          setCursor(id ? 'pointer' : 'default');
      };
      const onLeave = () => {
        store.setHover(null);
        if (toolRef.current === ToolType.None) setCursor('default');
      };

      const onDownFromNone = (ev: PointerEvent) => {
        if (toolRef.current !== ToolType.None) return;
        const { x, y } = getXY(ev);
        const id = geo.hitShapeIdAt(x, y, store.shapes);
        if (!id) return;
        ev.preventDefault();
        (host as any).setPointerCapture?.(ev.pointerId);

        store.select(id);
        const lg = geo.xToLogical(x),
          p = geo.yToPrice(y);
        if (lg == null || p == null) return;
        const snapshot = toJS(store.shapes.find((s) => s.id === id)!);

        dragRef.current = {
          mode: 'move',
          id,
          startCursor: { logical: lg, price: p },
          snapshot,
        };
        setCursor('grabbing');
      };

      const onMoveDragFromNone = (ev: PointerEvent) => {
        if (dragRef.current.mode !== 'move') return;
        const { x, y } = getXY(ev);
        const lg = geo.xToLogical(x),
          p = geo.yToPrice(y);
        if (lg == null || p == null) return;
        const st = dragRef.current.startCursor,
          snap = dragRef.current.snapshot;
        if (!st || !snap) return;
        const dL = LN(lg) - LN(st.logical),
          dP = p - st.price;
        store.moveSelected(dL, dP, snap);
        setCursor('grabbing');
      };

      const onUpDragFromNone = (ev: PointerEvent) => {
        if (dragRef.current.mode !== 'move') return;
        (host as any).releasePointerCapture?.(ev.pointerId);
        store.bump();
        dragRef.current = { mode: null, id: null };
        setCursor(store.hoverId ? 'pointer' : 'default');
      };

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
        setCursor('default');
      };
    }, [targetRef, chart, series, geo, store]);

    useEffect(() => {
      const host = targetRef.current;
      if (!host || !geo) return;

      const coords = (ev: MouseEvent | PointerEvent) => {
        const rect = (canvasRef.current ?? host).getBoundingClientRect();
        return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      };

      const tryDeleteAt = (x: number, y: number, ev: Event) => {
        const allow =
          toolRef.current === ToolType.None ||
          toolRef.current === ToolType.Select;
        if (!allow) return;

        const id = geo.hitShapeIdAt(x, y, store.shapes);
        if (!id) return;

        ev.preventDefault();
        ev.stopPropagation();
        store.Erase(id);
        store.select(null);
        // opcional: cursor coherente
        if (toolRef.current === ToolType.Select) {
          (targetRef.current as HTMLElement).style.cursor = 'default';
        }
      };

      const onPointerDown = (ev: PointerEvent) => {
        // botón derecho o Ctrl+Click
        if (ev.button === 2 || (ev.button === 0 && ev.ctrlKey)) {
          const { x, y } = coords(ev);
          tryDeleteAt(x, y, ev);
        }
      };

      const onContextMenu = (ev: MouseEvent) => {
        const { x, y } = coords(ev);
        tryDeleteAt(x, y, ev);
      };

      host.addEventListener('pointerdown', onPointerDown, true);
      host.addEventListener('contextmenu', onContextMenu, true);
      return () => {
        host.removeEventListener('pointerdown', onPointerDown, true);
        host.removeEventListener('contextmenu', onContextMenu, true);
      };
    }, [targetRef, geo, store]);

    // canvas: draw/select/erase + preview inmediata
    const getResizeCursorForRect = (): CursorCss => {
      if (!geo) return 'nwse-resize';
      const s =
        store.selectedId && store.shapes.find((x) => x.id === store.selectedId);
      if (!s || s.t !== ToolType.Rect) return 'nwse-resize';
      const a = geo.toPx(s.a),
        b = geo.toPx(s.b);
      if (!a || !b) return 'nwse-resize';
      const diagNWSE = (a.x < b.x && a.y < b.y) || (a.x > b.x && a.y > b.y);
      return diagNWSE ? 'nwse-resize' : 'nesw-resize';
    };

    const onPointerDown: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
      if (!chart || !series || tool === ToolType.None || !geo) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left,
        y = e.clientY - rect.top;

      if (tool === ToolType.Erase) {
        const id = geo.hitShapeIdAt(x, y, store.shapes);
        if (id) store.Erase(id);
        return;
      }

      if (tool === ToolType.Select) {
        const sel = store.selectedId
          ? store.shapes.find((s) => s.id === store.selectedId)
          : null;
        const hh = geo.hitHandlePx(x, y, sel ?? null);
        const id = hh ? hh.id : geo.hitShapeIdAt(x, y, store.shapes);

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
          store.select(id);
          const lg = geo.xToLogical(x),
            p = geo.yToPrice(y);
          if (lg == null || p == null) return;
          const snapshot = toJS(store.shapes.find((s) => s.id === id)!);
          dragRef.current = {
            mode: 'move',
            id,
            startCursor: { logical: lg, price: p },
            snapshot,
          };
          setCursor('grabbing');
          return;
        }
        store.select(null);
        onSetTool?.(ToolType.None);
        return;
      }

      // dibujo
      const lg = geo.xToLogical(x),
        p = geo.yToPrice(y);
      if (lg == null || p == null) return;
      store.startDraft(tool, { logical: lg, price: p });
      // cursor crosshair queda
    };

    const onPointerMove: React.PointerEventHandler<HTMLCanvasElement> = (e) => {
      if (!chart || !series || tool === ToolType.None || !geo) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left,
        y = e.clientY - rect.top;

      if (store.draft) {
        const lg = geo.xToLogical(x),
          p = geo.yToPrice(y);
        if (lg == null || p == null) return;
        store.updateDraft({ logical: lg, price: p });
        scheduleRedraw(); // preview
        return;
      }

      if (tool === ToolType.Select && !dragRef.current.mode) {
        const sel = store.selectedId
          ? store.shapes.find((s) => s.id === store.selectedId)
          : null;
        const overHandle = geo.hitHandlePx(x, y, sel ?? null);
        if (overHandle) setCursor(getResizeCursorForRect());
        else if (store.hoverId) setCursor('pointer');
        else setCursor('default');
      }

      if (tool === ToolType.Select) {
        if (
          dragRef.current.mode === 'move' &&
          dragRef.current.startCursor &&
          dragRef.current.snapshot
        ) {
          e.preventDefault();
          const lg = geo.xToLogical(x),
            p = geo.yToPrice(y);
          if (lg == null || p == null) return;
          const dL = LN(lg) - LN(dragRef.current.startCursor.logical);
          const dP = p - dragRef.current.startCursor.price;
          store.moveSelected(dL, dP, dragRef.current.snapshot);
          setCursor('grabbing');
          return;
        }
        if (dragRef.current.mode === 'handle' && dragRef.current.handle) {
          e.preventDefault();
          const lg = geo.xToLogical(x),
            p = geo.yToPrice(y);
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
      if (!chart || !series || tool === ToolType.None) return;
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);

      if (dragRef.current.mode) {
        store.bump();
        dragRef.current = { mode: null, id: null };
        if (tool === ToolType.Select)
          setCursor(store.hoverId ? 'pointer' : 'default');
        else if (tool === ToolType.Erase) setCursor('not-allowed');
        return;
      }

      const wasDrawing = !!store.draft;
      store.commitDraft();
      if (wasDrawing) onFinishDraw?.();
    };

    // Click derecho: borrar o cancelar draft
    const onCanvasContextMenu: React.MouseEventHandler<HTMLCanvasElement> = (
      e
    ) => {
      const allow =
        toolRef.current === ToolType.None ||
        toolRef.current === ToolType.Select;
      const rect = (
        e.currentTarget as HTMLCanvasElement
      ).getBoundingClientRect();
      const x = e.clientX - rect.left,
        y = e.clientY - rect.top;

      if (store.draft) {
        e.preventDefault();
        store.draft = null;
        store.bump();
        return;
      }
      if (!geo) return;

      const id = geo.hitShapeIdAt(x, y, store.shapes);
      if (allow && id) {
        e.preventDefault();
        store.Erase(id);
        store.select(null);
      }
    };

    return (
      <canvas
        ref={canvasRef}
        className={`draw-canvas ${tool !== ToolType.None ? 'active' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={onCanvasContextMenu}
      />
    );
  }
);

export default DrawingCanvas;
