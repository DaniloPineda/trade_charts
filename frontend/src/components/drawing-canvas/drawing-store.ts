import { makeAutoObservable } from 'mobx';
import { ToolType } from '../shared'; // 👈 ajusta ruta si es necesario
import { L, LN, isValidShape } from './drawing-types';
import type { DataPt, Shape } from './drawing-types';

export class DrawingStore {
  shapes: Shape[] = [];
  draft: Shape | null = null;
  selectedId: string | null = null;
  hoverId: string | null = null;

  dirty = 0;
  drawingsVisible = true;

  globalStroke = '#22d3ee';
  globalWidth = 2;

  constructor(public storageKey: string) {
    makeAutoObservable(this);
    this.load();
  }

  bump() { this.dirty++; }
  setHover(id: string | null) { this.hoverId = id; this.bump(); }

  setGlobalStyle(partial: { stroke?: string; width?: number }) {
    if (partial.stroke) this.globalStroke = partial.stroke;
    if (partial.width)  this.globalWidth  = partial.width;
    this.bump();
  }

  updateSelectedStyle(partial: { stroke?: string; width?: number }) {
    if (!this.selectedId) return;
    this.shapes = this.shapes.map(s => s.id === this.selectedId ? ({...s, ...partial} as Shape) : s);
    this.save(); this.bump();
  }

  updateDraftStyle(partial: { stroke?: string; width?: number }) {
    if (!this.draft) return;
    this.draft = { ...this.draft, ...partial } as Shape;
    this.bump();
  }

  startDraft(tool: ToolType, p: DataPt) {
    const base = { id: crypto.randomUUID(), stroke: this.globalStroke, width: this.globalWidth };
    if (tool === ToolType.Line)   this.draft = { ...base, t: ToolType.Line,   a: p, b: p } as Shape;
    if (tool === ToolType.Rect)   this.draft = { ...base, t: ToolType.Rect,   a: p, b: p } as Shape;
    if (tool === ToolType.Circle) this.draft = { ...base, t: ToolType.Circle, c: p, e: p } as Shape;
    this.bump();
  }

  updateDraft(p: DataPt) {
    if (!this.draft) return;
    if (this.draft.t === ToolType.Line)   this.draft = { ...this.draft, b: p };
    if (this.draft.t === ToolType.Rect)   this.draft = { ...this.draft, b: p };
    if (this.draft.t === ToolType.Circle) this.draft = { ...this.draft, e: p };
    this.bump();
  }

  commitDraft() {
    if (!this.draft) return;
    this.shapes.push(this.draft);
    this.draft = null;
    this.save(); this.bump();
  }

  select(id: string | null) { this.selectedId = id; this.bump(); }

  moveSelected(dL: number, dP: number, snapshot?: Shape) {
    if (!this.selectedId || !snapshot) return;
    const shift = (pt: DataPt): DataPt => ({ logical: L(LN(pt.logical) + dL), price: pt.price + dP });
    this.shapes = this.shapes.map(s => {
      if (s.id !== this.selectedId) return s;
      if (snapshot.t === ToolType.Line)   return { ...s, a: shift((snapshot as any).a), b: shift((snapshot as any).b) } as Shape;
      if (snapshot.t === ToolType.Rect)   return { ...s, a: shift((snapshot as any).a), b: shift((snapshot as any).b) } as Shape;
      if (snapshot.t === ToolType.Circle) return { ...s, c: shift((snapshot as any).c), e: shift((snapshot as any).e) } as Shape;
      return s;
    });
    this.bump();
  }

  replaceSelectedHandle(handle: 'a'|'b'|'c'|'e', p: DataPt) {
    if (!this.selectedId) return;
    this.shapes = this.shapes.map(s => {
      if (s.id !== this.selectedId) return s;
      if (s.t === ToolType.Line   && (handle==='a'||handle==='b')) return { ...s, [handle]: p } as Shape;
      if (s.t === ToolType.Rect   && (handle==='a'||handle==='b')) return { ...s, [handle]: p } as Shape;
      if (s.t === ToolType.Circle && (handle==='c'||handle==='e')) return { ...s, [handle]: p } as Shape;
      return s;
    });
    this.save(); this.bump();
  }

  Erase(id: string) {
    this.shapes = this.shapes.filter(s => s.id !== id);
    if (this.selectedId === id) this.selectedId = null;
    this.save(); this.bump();
  }

  save() {
    localStorage.setItem(`draw:${this.storageKey}`, JSON.stringify(this.shapes));
  }
  load() {
    try {
      const raw = localStorage.getItem(`draw:${this.storageKey}`);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) this.shapes = arr.filter(isValidShape);
    } catch {}
  }
}
