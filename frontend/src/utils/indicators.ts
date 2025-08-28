import { LineData, UTCTimestamp } from "lightweight-charts";

export type SmaRow = { time: UTCTimestamp, close: number};

export const sma = (rows: SmaRow[], len: number): LineData<UTCTimestamp>[] => {
    const out: LineData<UTCTimestamp>[] = [];
    let sum = 0, q: number[] = [];
    for (const r of rows) {
      q.push(r.close); sum += r.close;
      if (q.length > len) sum -= q.shift()!;
      if (q.length === len) out.push({ time: r.time, value: +(sum / len).toFixed(6) });
    }
    return out;
  };