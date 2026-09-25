import { useNavigate } from 'react-router-dom';
import { Search, Bookmark, Bell, Puzzle, Sun, Moon, LogIn, Smartphone } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const STORE_MARKS = [
  { id: 'tesco', logo: '/landing/landing_tescos.svg' },
  { id: 'sainsburys', logo: '/landing/landing_sainsburys.svg' },
  { id: 'asda', logo: '/landing/landing_asda.svg' },
  { id: 'morrisons', logo: '/landing/landing_morrisons.svg' },
  { id: 'marksandspencer', logo: '/landing/landing_mands.svg' },
  { id: 'aldi', logo: '/landing/landing_aldi.svg' },
  { id: 'lidl', logo: '/landing/landing_lidl.svg' },
  { id: 'coop', logo: '/landing/landing_coop.svg' },
  { id: 'waitrose', logo: '/landing/landing_waitrose.svg' },
  { id: 'iceland', logo: '/landing/landing_iceland.svg' },
  { id: 'ocado', logo: '/landing/landing_ocado.svg' },
];

const FEATURES = [
  {
    icon: Search,
    title: 'Search 11 UK supermarkets',
    desc: 'One search box opens results across Tesco, Sainsbury’s, M&S, Asda, Aldi, Lidl and more — up to 3 stores at a time.',
  },
  {
    icon: Bookmark,
    title: 'Pin to your watchlist',
    desc: 'Save the products you buy, with normal and loyalty prices side by side plus offer end dates and multi-buy terms.',
  },
  {
    icon: Bell,
    title: 'Offer-end alerts',
    desc: 'Sift checks your pinned offers daily and rings the bell when one ends — so expired deals never sit silently in your list.',
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
  { n: '03', title: 'Catch endings, not full prices', desc: 'When a pinned offer ends you get a bell alert — re-pin, switch stores, or stock up next time it drops.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();

  return (
    <div className="page-shell">
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
            Every offer. One watchlist.
            <span className="text-gradient block">Zero full-price surprises.</span>
          </h1>
          <p>
            Search 11 UK supermarkets, pin your staples, and get a bell alert
            when an offer ends. Free to join — tracking takes seconds.
          </p>
        </div>
      </section>

      <div className="stores-marquee" aria-label="Supported supermarkets">
        <div className="deals-track-wrapper">
          <div className="stores-track">
            {[...STORE_MARKS, ...STORE_MARKS].map((store, i) => (
              <img
                key={`${store.id}_${i}`}
                src={store.logo}
                alt=""
                aria-hidden={i >= STORE_MARKS.length ? true : undefined}
              />
            ))}
          </div>
        </div>
      </div>

      <section className="container landing-section" aria-labelledby="features-heading">
        <div className="text-center mb-6">
          <span className="field-label">Why Sift</span>
          <h2 id="features-heading" className="page-title">
            Stop paying <span className="text-gradient">full price</span> by accident
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(f => (
            <div key={f.title} className="metric-card metric-card--static">
              <div className="settings-card-header-icon primary text-accent" aria-hidden="true">
                <f.icon className="icon-md" />
              </div>
              <h3 className="landing-card-title">{f.title}</h3>
              <p className="landing-card-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container landing-section" aria-labelledby="steps-heading">
        <div className="text-center mb-6">
          <span className="field-label">How it works</span>
          <h2 id="steps-heading" className="page-title">Up and running in three steps</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(s => (
            <div key={s.n} className="metric-card metric-card--static">
              <span className="metric-value">{s.n}</span>
              <h3 className="landing-card-title">{s.title}</h3>
              <p className="landing-card-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container landing-cta-section">
        <div className="landing-cta-box">
          <h2 className="page-title landing-cta-title">
            Your watchlist is one sign-in away
          </h2>
          <p className="landing-cta-desc">
            Join free or start a 24-hour trial
          </p>
          <div className="landing-cta-actions">
            <button onClick={() => navigate('/auth')} className="btn-primary">
              Sign In / Get Started
              <LogIn className="icon-sm" />
            </button>
            <button className="btn-secondary" disabled title="Android app coming soon">
              <Smartphone className="icon-sm" />
              Android app — coming soon
            </button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container">Sift — UK supermarket grocery tracker</div>
      </footer>
    </div>
  );
}
