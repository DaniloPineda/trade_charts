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
