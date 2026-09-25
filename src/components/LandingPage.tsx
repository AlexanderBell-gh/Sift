import { useNavigate } from 'react-router-dom';
import { Search, Bookmark, Bell, Puzzle, Sun, Moon, LogIn } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const FEATURES = [
  {
    icon: Search,
    title: 'Search 11 UK supermarkets',
    desc: 'Compare grocery offers across Tesco, Sainsbury’s, M&S, Asda, Aldi, Lidl and more from one search box.',
  },
  {
    icon: Bookmark,
    title: 'Pin to your watchlist',
    desc: 'Track the products you buy. Sift keeps normal and loyalty prices side by side so you know when to stock up.',
  },
  {
    icon: Bell,
    title: 'Deal alerts',
    desc: 'Get notified the moment a pinned product goes on offer — before the deal expires.',
  },
  {
    icon: Puzzle,
    title: 'Browser extension',
    desc: 'Add products straight from any supermarket site. The extension reads the page and pins it in one click.',
  },
];

const STEPS = [
  { n: '01', title: 'Create your account', desc: 'Sign up free, or start a no-signup trial in one click.' },
  { n: '02', title: 'Pin your staples', desc: 'Search or use the extension to add the products you actually buy.' },
  { n: '03', title: 'Catch every deal', desc: 'We watch prices across stores and alert you when they drop.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <nav className="nav">
        <div className="container nav-inner">
          <div className="nav-cluster">
            <a href="/" className="logo">
              <div className="logo-mark">
                <div className="logo-tag"></div>
                <div className="logo-scan-line"></div>
              </div>
              <div className="logo-text">Sift</div>
            </a>
          </div>

          <div className="nav-links">
            <div className="hidden sm:flex items-center gap-6">
              <button onClick={() => navigate('/auth')} className="nav-link">Search</button>
              <button onClick={() => navigate('/auth')} className="nav-link">Watchlist</button>
            </div>

            <button
              onClick={toggle}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="icon-btn"
            >
              {isDark ? <Sun className="icon-md" /> : <Moon className="icon-md" />}
            </button>

            <button onClick={() => navigate('/auth')} className="user-menu-wrapper" aria-label="Sign in">
              <div className="user-avatar">
                <LogIn className="icon-sm" />
              </div>
              <span className="user-name hidden sm:inline">Sign In</span>
            </button>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="container">
          <h1>
            Never Miss a Grocery Offer
            <span className="text-gradient block">Across 11 UK Supermarkets</span>
          </h1>
          <p>
            Search deals, pin the products you buy, and get alerted when prices drop.
            Sign in to start tracking — it takes seconds.
          </p>
          <button onClick={() => navigate('/auth')} className="btn-primary">
            Get Started
            <LogIn className="icon-sm" />
          </button>
        </div>
      </section>

      <section className="container" aria-labelledby="features-heading">
        <div className="text-center mb-6">
          <span className="field-label">Why Sift</span>
          <h2 id="features-heading" className="page-title">
            Everything between you and <span className="text-gradient">paying full price</span>
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(f => (
            <div key={f.title} className="metric-card">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(255,87,1,0.08)] text-accent"
                aria-hidden="true"
              >
                <f.icon className="icon-md" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container" aria-labelledby="steps-heading" style={{ marginTop: 32 }}>
        <div className="text-center mb-6">
          <span className="field-label">How it works</span>
          <h2 id="steps-heading" className="page-title">Up and running in three steps</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(s => (
            <div key={s.n} className="metric-card">
              <span className="metric-value">{s.n}</span>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container" style={{ marginTop: 32, marginBottom: 80 }}>
        <div
          className="text-center"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '48px 24px',
          }}
        >
          <h2 className="page-title" style={{ marginBottom: 8 }}>
            Ready to stop scrolling for deals?
          </h2>
          <p style={{ fontSize: 16, color: 'var(--muted)', marginBottom: 24 }}>
            Create an account or start a trial — your watchlist follows you everywhere.
          </p>
          <button onClick={() => navigate('/auth')} className="btn-primary">
            Sign In / Get Started
            <LogIn className="icon-sm" />
          </button>
        </div>
      </section>

      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '24px 0',
          textAlign: 'center',
          fontSize: 13,
          color: 'var(--muted)',
        }}
      >
        <div className="container">Sift — grocery offer tracking for the UK</div>
      </footer>
    </div>
  );
}
