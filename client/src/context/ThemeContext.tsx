import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

interface ThemeState {
  isDarkMode: boolean;
}

type ThemeAction = { type: 'TOGGLE_DARK_MODE' } | { type: 'SET_DARK_MODE'; payload: boolean };

const getInitialTheme = (): boolean => {
  try {
    const saved = localStorage.getItem('darkMode');
    const parsed = saved !== null ? JSON.parse(saved) : false;
    if (parsed) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    return parsed;
  } catch (error) {
    console.warn('Unable to read theme preference, defaulting to light mode:', error);
    document.documentElement.classList.remove('dark-mode');
    return false;
  }
};

const initialState: ThemeState = {
  isDarkMode: getInitialTheme(),
};

const themeReducer = (state: ThemeState, action: ThemeAction): ThemeState => {
  switch (action.type) {
    case 'TOGGLE_DARK_MODE':
      return { ...state, isDarkMode: !state.isDarkMode };
    case 'SET_DARK_MODE':
      return { ...state, isDarkMode: action.payload };
    default:
      return state;
  }
};

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(state.isDarkMode));
    if (state.isDarkMode) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  }, [state.isDarkMode]);

  const toggleDarkMode = () => {
    dispatch({ type: 'TOGGLE_DARK_MODE' });
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode: state.isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

