import { Link, useNavigate } from 'react-router-dom';
import { Search, Bookmark, Bell, Puzzle, ShoppingCart, Sun, Moon, LogIn, Smartphone, Check } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useRevealRoot } from '../../hooks/useReveal';
import {
  SearchVisual,
  PinVisual,
  AlertVisual,
  ExtensionVisual,
  ListVisual,
} from '../features/landing/LandingVisuals';

const YEAR = new Date().getFullYear();

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
    Visual: SearchVisual,
  },
  {
    icon: Puzzle,
    title: 'Browser extension',
    desc: "Add products directly from any of the supported UK supermarket's on your computer — click the Sift icon and pin it in one click.",
    Visual: ExtensionVisual,
  },
  {
    icon: Bookmark,
    title: 'Pin to your watchlist',
    desc: 'Save the products you buy, with normal and loyalty prices side by side plus offer end dates and multi-buy terms — one tap into your shopping list.',
    Visual: PinVisual,
  },
  {
    icon: Bell,
    title: 'Offer-end alerts',
    desc: 'Sift checks your pinned offers daily and rings the bell when one ends — so expired deals never sit silently in your list.',
    Visual: AlertVisual,
  },
  {
    icon: ShoppingCart,
    title: 'Multibuy-smart shopping list',
    desc: 'Add watchlist items in quantities and get per-store totals with multi-buy sets applied — plus savings vs shelf price.',
    Visual: ListVisual,
  },
];

const STEPS = [
  { n: '01', title: 'Create your account', desc: 'Sign up free, or start a no-signup trial in one click.', mod: 'landing-step--a' },
  { n: '02', title: 'Pin your staples', desc: 'Search or use the extension to add the products you actually buy.', mod: 'landing-step--b' },
  { n: '03', title: 'Shop from one list', desc: 'Add watchlist items in quantities and shop per-store totals with multibuy savings applied — the whole shop in one place.', mod: 'landing-step--c' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const revealRoot = useRevealRoot<HTMLDivElement>();

  return (
    <div className="page-shell" ref={revealRoot}>
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
              <span className="user-name hidden sm:inline">Sign in</span>
            </button>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="container">
          <p className="landing-hero-eyebrow">
            <span className="landing-hero-dot" aria-hidden="true" />
            Free UK grocery tracker
          </p>
          <h1 className="landing-hero-title">
            One list for the whole shop.
            <span className="text-gradient block">Every store. Every deal.</span>
          </h1>
          <p className="landing-hero-sub">
            Search 11 UK supermarkets, pin your staples, and shop from one smart
            list. Free to join — tracking takes seconds.
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
        <div className="text-center mb-6" data-reveal>
          <span className="field-label">Why Sift</span>
          <h2 id="features-heading" className="page-title">
            All your groceries. <span className="text-gradient">One place.</span>
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="metric-card metric-card--static"
              data-reveal
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="settings-card-header-icon primary text-accent" aria-hidden="true">
                <f.icon className="icon-md" />
              </div>
              <h3 className="landing-card-title">{f.title}</h3>
              <p className="landing-card-desc">{f.desc}</p>
              <f.Visual />
            </div>
          ))}
        </div>
      </section>

      <section className="container landing-section" aria-labelledby="steps-heading">
        <div className="text-center mb-6" data-reveal>
          <span className="field-label">How it works</span>
          <h2 id="steps-heading" className="page-title">Up and running in three steps</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 landing-steps">
          {STEPS.map(s => (
            <div key={s.n} className={`metric-card metric-card--static landing-step ${s.mod}`}>
              <span className="landing-step-bar" aria-hidden="true" />
              <span className="metric-value landing-step-num">{s.n}</span>
              <h3 className="landing-card-title">{s.title}</h3>
              <p className="landing-card-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container landing-cta-section">
        <div className="landing-cta-box" data-reveal>
          <h2 className="page-title landing-cta-title">
            Your whole shop is one sign-in away
          </h2>
          <p className="landing-cta-desc">
            Join free or start a 24-hour trial
          </p>
          <div className="landing-cta-actions">
            <button onClick={() => navigate('/auth')} className="btn-primary">
              Sign in / Get started
              <LogIn className="icon-sm" />
            </button>
            <ul className="landing-cta-trust" aria-label="Why join free">
              <li className="landing-cta-trust--a">
                <Check className="icon-sm" aria-hidden="true" />
                Free to join
              </li>
              <li className="landing-cta-trust--b">
                <Check className="icon-sm" aria-hidden="true" />
                Easy to use
              </li>
              <li className="landing-cta-trust--c">
                <Check className="icon-sm" aria-hidden="true" />
                Try before Registering
              </li>
            </ul>
          </div>
        </div>
      </section>

      <p className="landing-app-strip" data-reveal>
        <Smartphone className="icon-sm" aria-hidden="true" />
        Android app coming soon
      </p>

      <footer className="landing-footer">
        <div className="container landing-footer-inner">
          <p className="landing-footer-brand">Sift — UK Grocery Tracker</p>
          <nav className="landing-footer-links" aria-label="Legal">
            <Link to="/privacy">Privacy</Link>
            <span aria-hidden="true">·</span>
            <Link to="/cookies">Cookies</Link>
            <span aria-hidden="true">·</span>
            <Link to="/about">About</Link>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              className="landing-footer-btn"
              onClick={() => document.dispatchEvent(new CustomEvent('cookie-consent-revoked'))}
            >
              Cookie settings
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" className="landing-footer-btn" onClick={() => navigate('/auth')}>
              Sign in
            </button>
          </nav>
          <p className="landing-footer-copy">© {YEAR} Sift</p>
        </div>
      </footer>
    </div>
  );
}
