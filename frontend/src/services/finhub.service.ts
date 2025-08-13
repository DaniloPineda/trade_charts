import { Service } from 'typedi';
import { CandleData, TimePeriod } from '../dtos/ticker-data.dto';
import { SymbolsDto } from '../dtos/symbols.dto';

@Service()
export default class FinhubService {
  async searchSymbols(query: string): Promise<SymbolsDto> {
    const response = await fetch(`/api/symbol-search?q=${query}`);
    return response.json();
  }

  async getHistoricalData(ticker: string, selectedPeriod: TimePeriod): Promise<CandleData[]> {
    const response = await fetch(`/api/market-data?ticker=${ticker}&period=${selectedPeriod}`);
    return response.json();
  }
}
