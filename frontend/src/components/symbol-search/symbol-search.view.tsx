import React, { FC } from 'react';
import symbolViewModel from './symbol-search.viewmodel';
import useSymbolSearchStyles from './styles';
import { observer } from 'mobx-react';

interface SymbolSearchProps {
  onSymbolSelect: (symbol: string) => void;
}

export const SymbolSearch: FC<SymbolSearchProps> = observer(
  ({ onSymbolSelect }) => {
    const { isLoading, query, setQuery, symbols, selectSymbol } =
      symbolViewModel;
    const classes = useSymbolSearchStyles();

    const handleSelect = (symbol: string) => {
      selectSymbol(symbol);
      onSymbolSelect(symbol);
    };

    return (
      <div className={classes.searchContainer}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          placeholder="Buscar símbolo (ej: SPY)"
          className={classes.searchInput}
        />
        {/* El loader ahora es un div con la clase que lo anima */}
        {isLoading && <div className={classes.loader} />}

        {/* Aplicamos la clase 'active' condicionalmente para activar la transición */}
        <ul
          className={`${classes.suggestionsList} ${symbols.length > 0 && !isLoading ? classes.suggestionsListActive : ''}`}
        >
          {symbols.map((item) => (
            <li
              key={item.symbol}
              onClick={() => handleSelect(item.symbol)}
              className={classes.suggestionItem}
            >
              {/* Usamos las nuevas clases para dar estilo al símbolo y la descripción */}
              <span className={classes.itemSymbol}>{item.symbol}</span>
              <span className={classes.itemDescription}>
                {item.description}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
);

export default SymbolSearch;
