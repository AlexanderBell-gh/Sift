import { Search, Check, Bell, Plus, X } from 'lucide-react';

/**
 * Landing card visuals — pure CSS/SVG mockups, zero image weight.
 * Decorative only: cards keep headings/descs for screen readers.
 * Loops are killed under prefers-reduced-motion (final state stays).
 */

export function SearchVisual() {
  return (
    <div className="landing-visual landing-visual--search landing-visual--tall" aria-hidden="true">
      <div className="lv-tabs">
        <span className="lv-tab lv-tab--active lv-tab--a">
          <img src="/Tesco_Logo.svg" alt="" className="lv-tab-logo" />
          Tesco
          <X className="lv-tab-x" />
        </span>
        <span className="lv-tab lv-tab--b">
          <img src="/Sainsbury's_Logo.svg" alt="" className="lv-tab-logo" />
          Sainsbury's
          <X className="lv-tab-x" />
        </span>
        <span className="lv-tab lv-tab--c">
          <img src="/Ocado_Logo.svg" alt="" className="lv-tab-logo" />
          Ocado
          <X className="lv-tab-x" />
        </span>
      </div>
      <div className="lv-browser">
        <div className="lv-browser-ui">
          <div className="lv-chips">
            <span className="lv-chip lv-chip--pick-a">
              <img src="/Tesco_Logo.svg" alt="" className="lv-chip-logo" />
              Tesco
              <X className="lv-chip-x" />
            </span>
            <span className="lv-chip lv-chip--pick-b">
              <img src="/Sainsbury's_Logo.svg" alt="" className="lv-chip-logo" />
              Sainsbury's
              <X className="lv-chip-x" />
            </span>
            <span className="lv-chip lv-chip--pick-c">
              <img src="/Ocado_Logo.svg" alt="" className="lv-chip-logo" />
              Ocado
              <X className="lv-chip-x" />
            </span>
          </div>
          <div className="lv-searchbar">
            <Search className="lv-search-icon" />
            <span className="lv-typed">
              <span className="lv-word">Sourdough</span>
            </span>
            <span className="lv-caret" />
            <span className="lv-searchbtn">Search</span>
          </div>
        </div>
        <div className="lv-page">
          <div className="lv-wltop">
            <span className="lv-thumb" />
            <span className="lv-wllines">
              <span className="lv-line lv-line--long" />
              <span className="lv-line lv-line--short" />
            </span>
          </div>
          <div className="lv-wltop">
            <span className="lv-thumb" />
            <span className="lv-wllines">
              <span className="lv-line lv-line--long" />
              <span className="lv-line lv-line--short" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PinVisual() {
  return (
    <div className="landing-visual landing-visual--tall" aria-hidden="true">
      <div className="lv-wlcard">
        <div className="lv-wltop">
          <span className="lv-thumb" />
          <span className="lv-wllines">
            <span className="lv-line lv-line--long" />
            <span className="lv-line lv-line--short" />
          </span>
        </div>
        <div className="lv-wlprice lv-stage-2">
          <span className="lv-wvar lv-wvar--loyalty">
            <span className="lv-wlwas">£2.10</span>
            <span className="lv-wlnow">£1.75</span>
            <i className="lv-walt">offer</i>
          </span>
          <span className="lv-wvar lv-wvar--multi">
            <span className="lv-wlplain">£2.10</span>
            <i className="lv-walt">Multi-buy · 2 for £3</i>
          </span>
        </div>
        <span className="lv-wlexpiry lv-stage-3">Offer ends Sunday</span>
        <span className="lv-wladd">
          <span className="lv-wladd-btn">
            <Plus className="lv-wladd-icon" />
            Add to list
          </span>
          <span className="lv-wladd-done">
            <Check className="lv-check" />
            Added
          </span>
        </span>
      </div>
    </div>
  );
}

export function AlertVisual() {
  return (
    <div className="landing-visual" aria-hidden="true">
      <div className="lv-bellwrap">
        <Bell className="lv-bell" />
        <span className="lv-badge" />
        <span className="lv-ping" />
        <span className="lv-ping lv-ping--late" />
      </div>
    </div>
  );
}

export function ExtensionVisual() {
  return (
    <div className="landing-visual" aria-hidden="true">
      <div className="lv-iconwrap">
        <span className="lv-floatbtn">
          <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <mask id="lv-float-hole">
                <rect width="32" height="32" fill="white" />
                <circle cx="16" cy="9" r="3" fill="black" />
              </mask>
            </defs>
            <g transform="rotate(-10 16 16)">
              <rect x="6" y="2" width="20" height="28" rx="4" fill="#FFFFFF" mask="url(#lv-float-hole)" />
            </g>
          </svg>
        </span>
      </div>
      <div className="lv-popup">
        <div className="lv-popup-top">
          <span className="lv-popup-thumb" />
          <span className="lv-popup-lines">
            <span className="lv-line lv-line--long" />
            <span className="lv-line lv-line--short" />
          </span>
        </div>
        <div className="lv-popup-prices">
          <span className="lv-popup-was">£2.10</span>
          <span className="lv-popup-offer">£1.75</span>
          <span className="lv-tag">offer</span>
        </div>
        <span className="lv-popup-swap">
          <span className="lv-popup-btn">Add to watchlist</span>
          <span className="lv-popup-done">
            <Check className="lv-check" />
            Added to watchlist
          </span>
        </span>
      </div>
    </div>
  );
}

export function ListVisual() {
  return (
    <div className="landing-visual" aria-hidden="true">
      <div className="lv-listrow">
        <span className="lv-qty">×2</span>
        <span className="lv-line lv-line--long" />
        <span className="lv-tag">2 for £3</span>
      </div>
      <div className="lv-listrow">
        <span className="lv-qty">×1</span>
        <span className="lv-line lv-line--short" />
      </div>
      <div className="lv-total">
        <span className="lv-total--was">£12.40</span>
        <span className="lv-total--now">£9.80</span>
      </div>
    </div>
  );
}
