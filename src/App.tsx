import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import SearchPage from './components/SearchPage';
import AuthPage from './components/AuthPage';
import WatchlistPage from './components/WatchlistPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
