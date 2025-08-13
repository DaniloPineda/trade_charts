import * as tickerData from "../dtos/ticker-data.dto";
import { action, makeObservable, observable } from "mobx";
import FinhubService from "../services/finhub.service";
import Container from "typedi";

class TradingChartsViewModel {  
    // Component State
    ticker: string = 'AAPL';
    selectedPeriod: tickerData.TimePeriod = '1h';
    activeTool: string = 'none';
    isLoading: boolean = false;
    isChartReady: boolean = false;
  
    // State for the info bar
    lastPrice: number | null = null;
    priceChange: number | null = null;
    volume: number | null = null;
    high24h: number | null = null;
    low24h: number | null = null;

    constructor(public service: FinhubService = Container.get(FinhubService)){
        makeObservable(this, {
            //Observables
            ticker: observable,
            selectedPeriod: observable,
            activeTool: observable,
            isLoading: observable,
            isChartReady: observable,
            lastPrice: observable,
            priceChange: observable,
            volume: observable,
            high24h: observable,
            low24h: observable,
            //Actions
            setIsChartReady: action,
            setIsLoading: action,
            setTicker: action,
            setSelectedPeriod: action,
            setActiveTool: action,
            setLastPrice: action,
        })
    }

  timePeriods: tickerData.TimePeriod[] = [
    '1m',
    '15m',
    '1h',
    '1d',
    '1w',
    '3m',
    '1y',
    '3y',
  ];

  setIsChartReady = () => {
    this.isChartReady = true;
  };

  setIsLoading = (loading: boolean) => {
    this.isLoading = loading;
  };

  setTicker = (ticker: string) => {
    this.ticker = ticker;
  }

  setSelectedPeriod = (period: tickerData.TimePeriod) => {
    this.selectedPeriod = period;
  }

  setActiveTool = (tool: string) => {
    this.activeTool = tool;
  }

  setLastPrice = (price: number) => {
    this.lastPrice = price;
  }

  setPriceChange = (price: number) => {
    this.priceChange = price;
  }

  setHigh24h = (high: number) => {
    this.high24h = high;
  }

  setLow24h = (low: number) => {
    this.low24h = low;
  }

  setVolume = (vol: number) => {
    this.volume = vol;
  }

  getHistoricalData = async() => {
    return await this.service.getHistoricalData(
        this.ticker,
        this.selectedPeriod
      );
  }
}

const tradingChartsViewModel = new TradingChartsViewModel()
export default tradingChartsViewModel