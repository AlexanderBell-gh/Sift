export interface Store {
  id: string;
  name: string;
  logo: string;
  searchUrl: (query: string) => string;
  offersUrl: string;
}

export const STORES: Store[] = [
  { id: 'tesco', name: 'Tesco', logo: '/storeicon_tesco.png', searchUrl: (q) => `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(q)}`, offersUrl: 'https://www.tesco.com/groceries/en-GB/promotions' },
  { id: 'sainsburys', name: "Sainsbury's", logo: '/storeicon_sainsburys.png', searchUrl: (q) => `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(q)}`, offersUrl: 'https://www.sainsburys.co.uk/gol-ui/offers' },
  { id: 'asda', name: 'ASDA', logo: '/storeicon_asda.png', searchUrl: (q) => `https://groceries.asda.com/search/${encodeURIComponent(q)}`, offersUrl: 'https://groceries.asda.com/special-offers' },
  { id: 'morrisons', name: 'Morrisons', logo: '/storeicon_morrisons.png', searchUrl: (q) => `https://www.morrisons.com/search?q=${encodeURIComponent(q)}`, offersUrl: 'https://www.morrisons.com/offers' },
  { id: 'marksandspencer', name: 'M&S', logo: '/storeicon_mands.png', searchUrl: (q) => `https://www.marksandspencer.com/l/search?q=${encodeURIComponent(q)}`, offersUrl: 'https://www.marksandspencer.com/c/food-to-order-offers' },
  { id: 'aldi', name: 'Aldi', logo: '/storeicon_aldi.png', searchUrl: (q) => `https://www.aldi.co.uk/search?q=${encodeURIComponent(q)}`, offersUrl: 'https://www.aldi.co.uk/offers' },
  { id: 'lidl', name: 'Lidl', logo: '/storeicon_lidl.png', searchUrl: (q) => `https://www.lidl.co.uk/h/search?q=${encodeURIComponent(q)}`, offersUrl: 'https://www.lidl.co.uk/h/weekly-offers' },
  { id: 'coop', name: 'Co-op', logo: '/storeicon_co-op.png', searchUrl: (q) => `https://www.coop.co.uk/search?q=${encodeURIComponent(q)}`, offersUrl: 'https://www.coop.co.uk/offers' },
  { id: 'waitrose', name: 'Waitrose', logo: '/storeicon_waitrose.png', searchUrl: (q) => `https://www.waitrose.com/search?searchTerm=${encodeURIComponent(q)}`, offersUrl: 'https://www.waitrose.com/search?searchTerm=offers' },
  { id: 'iceland', name: 'Iceland', logo: '/storeicon_iceland.png', searchUrl: (q) => `https://www.iceland.co.uk/search?q=${encodeURIComponent(q)}`, offersUrl: 'https://www.iceland.co.uk/offers' },
  { id: 'ocado', name: 'Ocado', logo: '/storeicon_ocado.png', searchUrl: (q) => `https://www.ocado.com/search?entry=${encodeURIComponent(q)}`, offersUrl: 'https://www.ocado.com/promotions' },
];
