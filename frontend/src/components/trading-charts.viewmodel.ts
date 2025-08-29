import * as tickerData from "../dtos/ticker-data.dto";
import { action, makeObservable, observable } from "mobx";
import FinhubService from "../services/finhub.service";
import Container from "typedi";
import { ToolType } from "./shared";

class TradingChartsViewModel {  
    // Component State
    ticker:string = process.env.REACT_APP_TICKER_SYMBOL || 'SPY';
    selectedPeriod: tickerData.TimePeriod = '1h';
    activeTool: ToolType = ToolType.None;
    isLoading: boolean = false;
    isChartReady: boolean = false;
    refresh: boolean = false;
    drawingsVisible: boolean = true;
    drawingColor: string = '#22d3ee';
    drawingWidth: number = 2;
  
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
            refresh: observable,
            drawingColor: observable,
            drawingsVisible: observable,
            drawingWidth: observable,
            //Actions
            setIsChartReady: action,
            setIsLoading: action,
            setTicker: action,
            setSelectedPeriod: action,
            setActiveTool: action,
            setLastPrice: action,
            setPriceChange: action,
            setHigh24h: action,
            setLow24h: action,
            setVolume: action,
            setRefresh: action,
            setDrawingColor: action,
            setDrawingsVisible: action,
            setDrawingWidth: action,
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

  setActiveTool = (tool: ToolType) => {
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

  setRefresh = (refresh: boolean) => {
    this.refresh = refresh;
  }

  setDrawingsVisible = (drawingsVisible: boolean) => {
    this.drawingsVisible = drawingsVisible;
  }
  
  setDrawingColor = (drawingColor: string) => {
    this.drawingColor = drawingColor;
  }
  
  setDrawingWidth = (drawingWidth: number) => {
      this.drawingWidth = drawingWidth;
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