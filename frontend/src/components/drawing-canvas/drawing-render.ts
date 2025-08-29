import { ToolType } from '../shared'; // 👈 ajusta
import { HANDLE_R, PALETTE, type DataPt, type Shape } from './drawing-types';

export function makeRenderer(params: {
  store: { shapes: Shape[]; draft: Shape | null; selectedId: string | null; hoverId: string | null; drawingsVisible: boolean; };
  canvas: HTMLCanvasElement;
  buffer: HTMLCanvasElement;
  isScalingRef: React.MutableRefObject<boolean>;
  canLayoutAll: () => boolean;
  toPxWithCache: (shapeId: string, key:'a'|'b'|'c'|'e', d: DataPt | null | undefined) => ({x:number;y:number} | null);
  getPt: (s:Shape, key:'a'|'b'|'c'|'e') => DataPt | null;
}) {
  const { store, canvas:c, buffer:buf, isScalingRef, canLayoutAll, toPxWithCache, getPt } = params;

  const redraw = () => {
    const ctx = c.getContext('2d')!;
    const bctx = buf.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    if (!store.drawingsVisible) {
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,c.width,c.height);
      return;
    }

    if (isScalingRef.current && !canLayoutAll()) {
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,c.width,c.height);
      ctx.drawImage(buf,0,0);
      return;
    }

    bctx.setTransform(1,0,0,1,0,0);
    bctx.clearRect(0,0,buf.width,buf.height);
    bctx.setTransform(dpr,0,0,dpr,0,0);
    const drawCtx = bctx;

    const drawShape = (s: Shape) => {
      drawCtx.lineWidth = s.width ?? 2;
      drawCtx.strokeStyle = s.stroke ?? PALETTE[0];

      if (s.t === ToolType.Line) {
        const a = toPxWithCache(s.id,'a', getPt(s,'a'));
        const b = toPxWithCache(s.id,'b', getPt(s,'b'));
        if (!a || !b) return;
        if (store.hoverId === s.id && store.selectedId !== s.id) {
          drawCtx.save();
          drawCtx.lineWidth = (s.width ?? 2) + 4;
          drawCtx.strokeStyle = 'rgba(255,255,255,0.35)';
          drawCtx.beginPath(); drawCtx.moveTo(a.x,a.y); drawCtx.lineTo(b.x,b.y); drawCtx.stroke();
          drawCtx.restore();
        }
        drawCtx.beginPath(); drawCtx.moveTo(a.x,a.y); drawCtx.lineTo(b.x,b.y); drawCtx.stroke();
      }

      if (s.t === ToolType.Rect) {
        const a = toPxWithCache(s.id,'a', getPt(s,'a'));
        const b = toPxWithCache(s.id,'b', getPt(s,'b'));
        if (!a || !b) return;
        const x = Math.min(a.x,b.x), y = Math.min(a.y,b.y), w = Math.abs(a.x-b.x), h = Math.abs(a.y-b.y);
        if (store.hoverId === s.id && store.selectedId !== s.id) {
          drawCtx.save();
          drawCtx.lineWidth = (s.width ?? 2) + 4;
          drawCtx.strokeStyle = 'rgba(255,255,255,0.35)';
          drawCtx.beginPath(); drawCtx.rect(x,y,w,h); drawCtx.stroke();
          drawCtx.restore();
        }
        drawCtx.beginPath(); drawCtx.rect(x,y,w,h); drawCtx.stroke();
      }

      if (s.t === ToolType.Circle) {
        const cc = toPxWithCache(s.id,'c', getPt(s,'c'));
        const ee = toPxWithCache(s.id,'e', getPt(s,'e'));
        if (!cc || !ee) return;
        const r = Math.hypot(ee.x-cc.x, ee.y-cc.y);
        if (store.hoverId === s.id && store.selectedId !== s.id) {
          drawCtx.save();
          drawCtx.lineWidth = (s.width ?? 2) + 4;
          drawCtx.strokeStyle = 'rgba(255,255,255,0.35)';
          drawCtx.beginPath(); drawCtx.arc(cc.x,cc.y,r,0,Math.PI*2); drawCtx.stroke();
          drawCtx.restore();
        }
        drawCtx.beginPath(); drawCtx.arc(cc.x,cc.y,r,0,Math.PI*2); drawCtx.stroke();
      }
    };

    for (const s of store.shapes) drawShape(s);
    if (store.draft) drawShape(store.draft);

    if (store.selectedId) {
      const s = store.shapes.find(x => x.id===store.selectedId);
      if (s) {
        drawCtx.fillStyle = s.stroke ?? PALETTE[0];
        const push = (p: DataPt | null, key:'a'|'b'|'c'|'e') => {
          if (!p) return;
          const pt = toPxWithCache(s.id, key, p); if (!pt) return;
          drawCtx.beginPath(); drawCtx.arc(pt.x, pt.y, HANDLE_R, 0, Math.PI*2); drawCtx.fill();
        };
        if (s.t===ToolType.Line)  { push(s.a,'a'); push(s.b,'b'); }
        if (s.t===ToolType.Rect)  { push(s.a,'a'); push(s.b,'b'); }
        if (s.t===ToolType.Circle){ push(s.c,'c'); push(s.e,'e'); }
      }
    }

    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,c.width,c.height);
    ctx.drawImage(buf,0,0);
  };

  return { redraw };
}
