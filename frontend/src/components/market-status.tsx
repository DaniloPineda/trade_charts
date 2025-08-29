// MarketStatusPill.tsx
import React from 'react';

function nyParts(d: Date) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  });
  const parts = f.formatToParts(d).reduce((acc: any, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const hh = Number(parts.hour),
    mm = Number(parts.minute);
  return { wd: parts.weekday as string, hh, mm };
}

function isWeekdayNY(d: Date) {
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
  }).format(d);
  return !['Sat', 'Sun'].includes(wd);
}

function statusNY(d: Date) {
  if (!isWeekdayNY(d)) return 'CLOSED';
  const { hh, mm } = nyParts(d);
  const mins = hh * 60 + mm;
  if (mins >= 9 * 60 + 30 && mins < 16 * 60) return 'OPEN'; // 9:30–16:00 ET
  if (mins >= 4 * 60 && mins < 9 * 60 + 30) return 'PRE'; // 4:00–9:30
  if (mins >= 16 * 60 && mins < 20 * 60) return 'POST'; // 16:00–20:00
  return 'CLOSED';
}

export default function MarketStatus() {
  const [now, setNow] = React.useState<Date>(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const local = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(now);

  const ny = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  const st = statusNY(now);
  const color =
    st === 'OPEN'
      ? '#10b981'
      : st === 'PRE'
        ? '#f59e0b'
        : st === 'POST'
          ? '#f59e0b'
          : '#ef4444';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: '#0b1220',
        border: '1px solid #334155',
        padding: '6px 10px',
        borderRadius: 999,
        width: '300px',
        justifyContent: 'center',
      }}
    >
      <span
        style={{ width: 8, height: 8, borderRadius: 999, background: color }}
      />
      <strong style={{ color: '#e5e7eb', fontSize: 12 }}>{st}</strong>
      <span style={{ color: '#94a3b8', fontSize: 12 }}>Local {local}</span>
      <span style={{ color: '#94a3b8', fontSize: 12 }}>ET {ny}</span>
    </div>
  );
}
