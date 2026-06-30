import { useNavigate } from 'react-router-dom';
import { BookmarkCheck, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavHeaderProps {
  title?: string;
  showBack?: boolean;
}

export default function NavHeader({ title = 'Sift', showBack = false }: NavHeaderProps) {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span className="text-xl font-bold gradient-text">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          {token && (
            <button
              onClick={() => navigate('/watchlist')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <BookmarkCheck className="w-4 h-4" />
              Watchlist
            </button>
          )}
          {token ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">{user?.username}</span>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="px-3 py-1.5 rounded-lg text-sm bg-accent text-black font-medium hover:bg-accent-light transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
