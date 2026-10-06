import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function LegalLayout({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="page-shell">
      <div className="container legal-wrap">
        <Link to="/" className="legal-back">
          <ArrowLeft className="icon-sm" aria-hidden="true" />
          Back to Sift
        </Link>
        <article className="legal-card">
          <h1 className="legal-title">{title}</h1>
          <p className="legal-updated">Last updated {updated}</p>
          {children}
        </article>
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <LegalLayout title="About Sift" updated="October 2026">
      <p>
        Sift is a UK grocery tracker. Search 11 UK supermarkets, pin your
        staples to a watchlist, and shop from one smart list with multibuy
        savings applied.
      </p>
      <h2>Prices and products</h2>
      <p>
        All prices, products, and store names and logos belong to their
        respective supermarkets. They are shown as listed and may differ
        in-store or online — always check the shelf edge or product page
        before you buy.
      </p>
      <h2>No affiliation</h2>
      <p>
        Sift is an independent tracker and is not affiliated with, sponsored
        by, or endorsed by any supermarket.
      </p>
      <h2>Where listings come from</h2>
      <p>
        Product details come from public UK supermarket listings via search
        and the Sift browser extension. Sift never sees your supermarket
        logins or payment details.
      </p>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy policy" updated="October 2026">
      <p>
        Sift is a UK grocery tracker. This policy explains what data Sift stores
        and how it is used. Sift uses no analytics or tracking cookies.
      </p>
      <h2>Account data</h2>
      <p>
        When you register, Sift stores your username and email address plus a
        secure hash of your password — never the password itself. If you sign
        in with Google, Sift stores the Google account link instead of a
        password. Trial accounts work without registration and expire
        automatically after 24 hours.
      </p>
      <h2>Your groceries</h2>
      <p>
        Sift stores the products you pin to your watchlist, your shopping-list
        quantities, and your offer-end alerts. Product details come from public
        UK supermarket listings. Sift never sees your supermarket logins or
        payment details.
      </p>
      <h2>Stored in your browser</h2>
      <p>Sift keeps four items in your browser&apos;s local storage:</p>
      <ul>
        <li>
          <code>auth_token</code> — keeps you signed in.
        </li>
        <li>
          <code>sift_theme</code> — remembers your light or dark mode choice.
        </li>
        <li>
          <code>sift-selected-stores</code> — remembers your search store
          picks.
        </li>
        <li>
          <code>cookie_consent</code> — remembers you saw the cookie notice.
        </li>
      </ul>
      <p>
        Clearing your browser storage signs you out and resets these choices.
        See the <Link to="/cookies">cookie policy</Link> for more detail.
      </p>
      <h2>Deleting your data</h2>
      <p>
        You can permanently delete your account and all associated data at any
        time from Settings → Account Deletion. Deletion takes effect
        immediately and cannot be undone.
      </p>
    </LegalLayout>
  );
}

export function CookiesPage() {
  return (
    <LegalLayout title="Cookie policy" updated="October 2026">
      <p>
        Sift sets no HTTP cookies and uses no third-party analytics or
        advertising cookies. Everything below lives only in your
        browser&apos;s local storage.
      </p>
      <h2>What Sift stores</h2>
      <ul>
        <li>
          <code>auth_token</code> — your sign-in session. Required to stay
          signed in.
        </li>
        <li>
          <code>sift_theme</code> — your light or dark mode preference.
        </li>
        <li>
          <code>sift-selected-stores</code> — the supermarkets you picked for
          search.
        </li>
        <li>
          <code>cookie_consent</code> — records that you acknowledged the
          cookie notice.
        </li>
      </ul>
      <h2>Google sign-in</h2>
      <p>
        If you sign in with Google, Google&apos;s own sign-in cookies apply as
        described in Google&apos;s privacy policy. Sift receives only your
        basic profile link, never your Google password.
      </p>
      <h2>Managing storage</h2>
      <p>
        Use the Cookie settings link in the footer to reopen the cookie notice
        at any time. Clearing your browser storage removes all four items and
        signs you out.
      </p>
    </LegalLayout>
  );
}
