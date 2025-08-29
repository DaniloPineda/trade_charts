import React, { JSX } from 'react';

export enum ToolType {
  None = 'None',
  Select = 'Select',
  Line = 'Line',
  Rect = 'Rect',
  Circle = 'Circle',
  Erase = 'Erase',
}

const ICONS: Record<ToolType, JSX.Element> = {
  [ToolType.Select]: (
    <svg viewBox="0 0 24 24">
      <path
        d="M4 4l6 14 2-6 6-2-14-6z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  ),
  [ToolType.Line]: (
    <svg viewBox="0 0 24 24">
      <path d="M4 20L20 4" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  ),
  [ToolType.Rect]: (
    <svg viewBox="0 0 24 24">
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  ),
  [ToolType.Circle]: (
    <svg viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="7"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  ),
  [ToolType.Erase]: (
    <svg viewBox="0 0 24 24">
      <path
        d="M16 3L21 8L9 20H4L3 19L16 3Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  ),
  [ToolType.None]: (
    <svg viewBox="0 0 24 24">
      <path d="M4 12h16" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  ),
};

export function DrawIcon({
  type,
  className,
}: {
  type: ToolType;
  className?: string;
}): JSX.Element {
  return (
    <span
      className={className}
      style={{ display: 'grid', placeItems: 'center' }}
    >
      {ICONS[type]}
    </span>
  );
}

export const EyeIcon = (p: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={p.className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = (p: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={p.className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M3 3l18 18M10.6 10.6a3 3 0 004.24 4.24M9.88 4.26A10.91 10.91 0 0112 4c7 0 11 8 11 8a17.7 17.7 0 01-5.06 5.35" />
    <path d="M6.06 6.06A17.7 17.7 0 001 12s4 8 11 8a10.9 10.9 0 005.12-1.25" />
  </svg>
);

export const RefreshIcon = (p: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={p.className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20 11a8 8 0 10-2.34 5.66M20 4v7h-7" />
  </svg>
);
