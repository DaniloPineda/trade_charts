import { UTCTimestamp } from "lightweight-charts";

export type TimePeriod = '1m' | '15m' | '1h' | '1d' | '1w' | '3m' | '1y' | '3y';

export interface CandleData {
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
}

export interface TickerDto extends CandleData {
    volume: number
}