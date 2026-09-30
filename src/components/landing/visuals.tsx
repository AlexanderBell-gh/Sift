import { Search, Check, Bell, MousePointerClick, Tag } from 'lucide-react';

/**
 * Landing card visuals — pure CSS/SVG mockups, zero image weight.
 * Decorative only: cards keep headings/descs for screen readers.
 * Loops are killed under prefers-reduced-motion (final state stays).
 */

export function SearchVisual() {
  return (
    <div className="landing-visual landing-visual--search" aria-hidden="true">
      <div className="lv-searchbar">
        <Search className="lv-search-icon" />
        <span className="lv-typed">
          <i className="lv-letter lv-t1">S</i>
          <i className="lv-letter lv-t2">o</i>
          <i className="lv-letter lv-t3">u</i>
          <i className="lv-letter lv-t4">r</i>
          <i className="lv-letter lv-t5">d</i>
          <i className="lv-letter lv-t6">o</i>
          <i className="lv-letter lv-t7">u</i>
          <i className="lv-letter lv-t8">g</i>
          <i className="lv-letter lv-t9">h</i>
        </span>
        <span className="lv-caret" />
      </div>
      <div className="lv-chips">
        <span className="lv-chip lv-chip--pick">Tesco</span>
        <span className="lv-chip">Asda</span>
        <span className="lv-chip">Aldi</span>
      </div>
    </div>
  );
}

export function PinVisual() {
  return (
    <div className="landing-visual landing-visual--tall" aria-hidden="true">
      <div className="lv-row">
        <span className="lv-thumb" />
        <span className="lv-lines">
          <span className="lv-line lv-line--long" />
          <span className="lv-line lv-line--short" />
        </span>
      </div>
      <div className="lv-prices lv-stage-2">
        <span className="lv-price">£2.10</span>
        <span className="lv-price lv-price--loyalty">£1.75 loyalty</span>
      </div>
      <div className="lv-pmeta lv-stage-3">
        <span className="lv-pmeta-text">Offer ends Sunday</span>
        <span className="lv-tag">2 for £3</span>
      </div>
      <span className="lv-pinswap">
        <span className="lv-pinbtn">Add to watchlist</span>
        <span className="lv-pindone">
          <Check className="lv-check" />
          Added
        </span>
      </span>
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
        <span className="lv-sifticon">
          <Tag className="lv-sifticon-mark" />
        </span>
        <MousePointerClick className="lv-cursor" />
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
