export interface Symbol {
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
}

export interface SymbolsDto {
    count: number;
    result: Symbol[];
}