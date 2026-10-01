import { Search, Check, Bell, MousePointerClick, Tag, Plus } from 'lucide-react';

/**
 * Landing card visuals — pure CSS/SVG mockups, zero image weight.
 * Decorative only: cards keep headings/descs for screen readers.
 * Loops are killed under prefers-reduced-motion (final state stays).
 */

export function SearchVisual() {
  return (
    <div className="landing-visual landing-visual--search" aria-hidden="true">
      <div className="lv-chips">
        <span className="lv-chip lv-chip--pick-a">Tesco</span>
        <span className="lv-chip lv-chip--pick-b">Asda</span>
        <span className="lv-chip lv-chip--pick-c">Aldi</span>
      </div>
      <div className="lv-searchbar">
        <Search className="lv-search-icon" />
        <span className="lv-typed">
          <span className="lv-word">Sourdough</span>
        </span>
        <span className="lv-caret" />
        <span className="lv-searchbtn">Search</span>
      </div>
      <div className="lv-tabs">
        <span className="lv-tab lv-tab--a">
          <i className="lv-tab-dot" />
          Tesco
        </span>
        <span className="lv-tab lv-tab--b">
          <i className="lv-tab-dot" />
          Asda
        </span>
        <span className="lv-tab lv-tab--c">
          <i className="lv-tab-dot" />
          Aldi
        </span>
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
