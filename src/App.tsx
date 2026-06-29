import { Routes, Route, Navigate } from 'react-router-dom';
import SearchPage from './components/SearchPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<SearchPage />} />
      <Route path="/watchlist" element={
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <p>Watchlist - Phase 2</p>
        </div>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
