import { Service } from 'typedi';
const FINHUB_API_URL = 'http://localhost:8000/api';

@Service()
export default class FinhubService {
  async searchSymbols(query: string) {
    const response = await fetch(`${FINHUB_API_URL}/symbol-search?q=${query}`);
    return response.json();
  }
}
