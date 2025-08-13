import { TimePeriod } from "../dtos/ticker-data.dto";

export const getIntervalSeconds = (period: TimePeriod): number => {
    switch (period) {
      case '1m':
        return 60;
      case '15m':
        return 15 * 60;
      case '1h':
        return 60 * 60;
      case '1d':
        return 24 * 60 * 60;
      case '1w':
        return 7 * 24 * 60 * 60;
      case '3m':
        return 90 * 24 * 60 * 60;
      case '1y':
        return 365 * 24 * 60 * 60;
      case '3y':
        return 3 * 365 * 24 * 60 * 60;
      default:
        return 60;
    }
  };

export const formatPrice = (price: number | null): string => {
  if (price === null) return 'N/A';
  return `$${price.toFixed(2)}`;
};

export  const formatChange = (change: number | null): string => {
  if (change === null) return 'N/A';
  const sign = change >= 0 ? '+' : '';
  return `${sign}$${change.toFixed(2)}`;
};

export const formatChangePercent = (
  change: number | null,
  lastPrice: number | null
): string => {
  if (change === null || lastPrice === null) return 'N/A';
  const percent = (change / (lastPrice - change)) * 100;
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
};

export const formatVolume = (volume: number | null): string => {
  if (volume === null) return 'N/A';
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toString();
};