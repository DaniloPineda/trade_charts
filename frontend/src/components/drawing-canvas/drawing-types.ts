import type { Logical, Coordinate } from 'lightweight-charts';
import { ToolType } from '../shared'; // 👈 ajusta la ruta si es necesario

export type DataPt = { logical: Logical; price: number };
export type CursorCss = NonNullable<React.CSSProperties['cursor']>;

export type BaseShape = { id: string; stroke: string; width: number };
export type LineShape   = BaseShape & { t: ToolType.Line;   a: DataPt; b: DataPt };
export type RectShape   = BaseShape & { t: ToolType.Rect;   a: DataPt; b: DataPt };
export type CircleShape = BaseShape & { t: ToolType.Circle; c: DataPt; e: DataPt };
export type Shape = LineShape | RectShape | CircleShape;

export type LogicalRange = { from: Logical; to: Logical };

export const HANDLE_R = 6;
export const PALETTE = ['#22d3ee', '#f59e0b', '#a78bfa', '#ef4444', '#10b981'];

export const L  = (n: number) => n as unknown as Logical;
export const LN = (l: Logical) => l as unknown as number;
export const CN = (c: Coordinate): number => c as unknown as number;

// Helpers seguros
export const isValidPt = (p: any): p is DataPt =>
  p && p.logical != null && typeof p.price === 'number';

export const isValidShape = (s: any): s is Shape => {
  if (!s || !s.t || !s.id) return false;
  if (s.t === ToolType.Line || s.t === ToolType.Rect) return isValidPt(s.a) && isValidPt(s.b);
  if (s.t === ToolType.Circle) return isValidPt(s.c) && isValidPt(s.e);
  return false;
};
