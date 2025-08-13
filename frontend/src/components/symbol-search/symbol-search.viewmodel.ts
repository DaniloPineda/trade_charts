import { action, makeObservable, observable, runInAction } from 'mobx'; // 'runInAction' no es necesario aquí
import FinhubService from '../../services/finhub.service';
import Container from 'typedi';
import { Symbol } from '../../dtos/symbols.dto';

export class SymbolSearchViewModel {
  // Para manejar el timer del debouncer
  private debounceTimer: NodeJS.Timeout | null = null;

  isLoading: boolean = false;
  query: string = '';
  symbols: Symbol[] = [];

  constructor(private service: FinhubService = Container.get(FinhubService)) {
    // Hacemos las propiedades observables y las acciones, acciones.
    makeObservable(this, {
      isLoading: observable,
      query: observable,
      symbols: observable,
      setQuery: action,
      fetchSymbols: action,
      selectSymbol: action,
    });
  }

  selectSymbol = (symbol: string) => {
    this.query = symbol;
    this.symbols = []; // Actualiza el query y limpia los símbolos en una sola acción
  };

  // Esta acción ahora manejará TODA la lógica
  setQuery = (query: string) => {
    this.query = query;
    this.isLoading = true;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    if (query.length < 2) {
      //this.symbols = [];
      this.isLoading = false;
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.fetchSymbols();
    }, 500);
  };

  fetchSymbols = async () => {
    try {
      const symbolsResult = await this.service.searchSymbols(this.query);
      runInAction(() => {
        this.symbols = symbolsResult.result || [];
      });
    } catch (error) {
      console.error('Error fetching symbols:', error);
      runInAction(() => {
        this.symbols = [];
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  };
}

const symbolViewModel = new SymbolSearchViewModel();
export default symbolViewModel;
