import { Service } from 'typedi';

@Service()
export default class FinhubService {
  async searchSymbols(query: string) {
    const response = await fetch(`/api/symbol-search?q=${query}`);
    return response.json();
  }
}
