import { createUseStyles } from 'react-jss';

// --- Nuestro Tema de Diseño ---
const theme = {
  background: '#111827',
  surface: '#1F2937',
  primary: '#38BDF8',
  text: '#E5E7EB',
  textSecondary: '#9CA3AF',
  borderRadius: '8px',
  transition: 'all 0.2s ease-in-out',
};

// --- Hook de Estilos con JSS ---
const useSymbolSearchStyles = createUseStyles({
  searchContainer: {
    position: 'relative',
    width: 300,
    fontFamily: '"Segoe UI", Roboto, sans-serif', // Una fuente más moderna
  },

  searchInput: {
    width: '100%',
    padding: '12px 16px', // Más espaciado interno
    fontSize: 16,
    boxSizing: 'border-box',
    backgroundColor: theme.surface,
    color: theme.text,
    border: `2px solid transparent`, // Borde transparente para no causar saltos
    borderRadius: theme.borderRadius,
    outline: 'none', // Quitamos el feo contorno del navegador
    transition: theme.transition, // Aplicamos la transición a todos los cambios

    // Estilo cuando el input está enfocado (el usuario está escribiendo)
    '&:focus': {
      borderColor: theme.primary,
      boxShadow: `0 0 0 3px ${theme.primary}40`, // Un brillo sutil al hacer foco
    },
  },

  // Contenedor de la lista de sugerencias con transiciones
  suggestionsList: {
    position: 'absolute',
    top: 'calc(100% + 8px)', // Un poco de espacio entre el input y la lista
    left: 0,
    right: 0,
    background: theme.surface,
    listStyle: 'none',
    padding: '8px',
    margin: 0,
    maxHeight: 250,
    overflowY: 'auto',
    zIndex: 1000,
    borderRadius: theme.borderRadius,
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)', // Sombra para dar profundidad

    // Estado inicial para la transición: invisible y ligeramente desplazado hacia arriba
    opacity: 0,
    transform: 'translateY(-10px)',
    visibility: 'hidden',
    transition: 'opacity 0.2s ease, transform 0.2s ease, visibility 0.2s',
  },

  // Clase que aplicaremos para mostrar la lista
  suggestionsListActive: {
    opacity: 1,
    transform: 'translateY(0)',
    visibility: 'visible',
  },

  // Estilo para cada elemento de la lista
  suggestionItem: {
    padding: '10px 12px',
    cursor: 'pointer',
    borderRadius: '4px', // Bordes redondeados también para los ítems
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'background-color 0.15s ease-in-out',

    // Estilo para el hover
    '&:hover': {
      backgroundColor: theme.primary,
      color: theme.background,
    },
  },

  // Separamos el símbolo y la descripción para darles estilos diferentes
  itemSymbol: {
    fontWeight: 'bold',
    color: theme.text,
    // Al hacer hover, el color del texto padre (`suggestionItem`) cambiará
  },
  itemDescription: {
    fontSize: '0.85em',
    color: theme.textSecondary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginLeft: '16px',
  },

  // Un spinner animado para el loader
  loader: {
    position: 'absolute',
    right: '12px',
    top: '12px',
    width: '20px',
    height: '20px',
    border: `3px solid ${theme.surface}`,
    borderTopColor: theme.primary,
    borderRadius: '50%',
    animation: '$spin 1s linear infinite',
  },

  // Definición de la animación para el spinner
  '@keyframes spin': {
    '0%': { transform: 'rotate(0deg)' },
    '100%': { transform: 'rotate(360deg)' },
  },
});

export default useSymbolSearchStyles;
