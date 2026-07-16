export interface Store {
  id: string;
  name: string;
  logo: string;
  searchUrl: (query: string) => string;
}

export const STORES: Store[] = [
  { id: 'tesco', name: 'Tesco', logo: '/storeicon_tesco.png', searchUrl: (q) => `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(q)}` },
  { id: 'sainsburys', name: "Sainsbury's", logo: '/storeicon_sainsburys.png', searchUrl: (q) => `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(q)}` },
  { id: 'asda', name: 'ASDA', logo: '/storeicon_asda.png', searchUrl: (q) => `https://groceries.asda.com/search/${encodeURIComponent(q)}` },
  { id: 'morrisons', name: 'Morrisons', logo: '/storeicon_morrisons.png', searchUrl: (q) => `https://www.morrisons.com/search?q=${encodeURIComponent(q)}` },
  { id: 'marksandspencer', name: 'M&S', logo: '/storeicon_mands.png', searchUrl: (q) => `https://www.marksandspencer.com/l/search?q=${encodeURIComponent(q)}` },
  { id: 'aldi', name: 'Aldi', logo: '/storeicon_aldi.png', searchUrl: (q) => `https://www.aldi.co.uk/search?q=${encodeURIComponent(q)}` },
  { id: 'lidl', name: 'Lidl', logo: '/storeicon_lidl.png', searchUrl: (q) => `https://www.lidl.co.uk/h/search?q=${encodeURIComponent(q)}` },
  { id: 'coop', name: 'Co-op', logo: '/storeicon_co-op.png', searchUrl: (q) => `https://www.coop.co.uk/search?q=${encodeURIComponent(q)}` },
  { id: 'waitrose', name: 'Waitrose', logo: '/storeicon_waitrose.png', searchUrl: (q) => `https://www.waitrose.com/search?searchTerm=${encodeURIComponent(q)}` },
  { id: 'iceland', name: 'Iceland', logo: '/storeicon_iceland.png', searchUrl: (q) => `https://www.iceland.co.uk/search?q=${encodeURIComponent(q)}` },
  { id: 'ocado', name: 'Ocado', logo: '/storeicon_ocado.png', searchUrl: (q) => `https://www.ocado.com/search?entry=${encodeURIComponent(q)}` },
];
