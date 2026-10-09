export interface Store {
  id: string;
  name: string;
  logo: string;
  searchUrl: (query: string) => string;
}

export const STORES: Store[] = [
  { id: 'tesco', name: 'Tesco', logo: '/tesco.png', searchUrl: (q) => `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(q)}` },
  { id: 'sainsburys', name: "Sainsbury's", logo: '/sainsburys.png', searchUrl: (q) => `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(q)}` },
  { id: 'asda', name: 'ASDA', logo: '/asda.png', searchUrl: (q) => `https://groceries.asda.com/search/${encodeURIComponent(q)}` },
  { id: 'morrisons', name: 'Morrisons', logo: '/morrisons.png', searchUrl: (q) => `https://groceries.morrisons.com/search?q=${encodeURIComponent(q)}` },
  { id: 'marksandspencer', name: 'M&S', logo: '/mands.png', searchUrl: (q) => `https://www.marksandspencer.com/food/search?referrer=food-catalogue&searchTerm=${encodeURIComponent(q)}` },
  { id: 'aldi', name: 'Aldi', logo: '/aldi.png', searchUrl: (q) => `https://www.aldi.co.uk/results?q=${encodeURIComponent(q)}` },
  { id: 'lidl', name: 'Lidl', logo: '/lidl.png', searchUrl: (q) => `https://www.lidl.co.uk/q/search?q=${encodeURIComponent(q)}` },
  { id: 'coop', name: 'Co-op', logo: '/coop.png', searchUrl: (q) => `https://www.coop.co.uk/search?query=${encodeURIComponent(q)}` },
  { id: 'waitrose', name: 'Waitrose', logo: '/waitrose.png', searchUrl: (q) => `https://www.waitrose.com/ecom/shop/search?&searchTerm=${encodeURIComponent(q)}` },
  { id: 'iceland', name: 'Iceland', logo: '/iceland.png', searchUrl: (q) => `https://www.iceland.co.uk/search?q=${encodeURIComponent(q)}` },
  { id: 'ocado', name: 'Ocado', logo: '/ocado.png', searchUrl: (q) => `https://www.ocado.com/search?q=${encodeURIComponent(q)}` },
];

/**
 * Resolve the logo to render for a store. Local canonical PNGs win;
 * the DB value (extension-supplied, may be a stale or remote URL) is
 * the fallback. Returns '' when neither exists.
 */
export function storeLogoFor(storeName: string, dbLogo?: string | null): string {
  return STORES.find((s) => s.name === storeName)?.logo ?? dbLogo ?? '';
}
