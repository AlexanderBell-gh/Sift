export interface Store {
  id: string;
  name: string;
  logo: string;
  searchUrl: (query: string) => string;
  offersUrl: string;
}

export const STORES: Store[] = [
  { id: 'tesco', name: 'Tesco', logo: '/Tesco_Logo.svg', searchUrl: (q) => `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(q)}`, offersUrl: 'https://www.tesco.com/groceries/en-GB/promotions' },
  { id: 'sainsburys', name: "Sainsbury's", logo: '/Sainsbury\'s_Logo.svg', searchUrl: (q) => `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(q)}`, offersUrl: 'https://www.sainsburys.co.uk/gol-ui/offers' },
  { id: 'asda', name: 'ASDA', logo: '/ASDA_Logo.svg', searchUrl: (q) => `https://groceries.asda.com/search/${encodeURIComponent(q)}`, offersUrl: 'https://groceries.asda.com/special-offers' },
  { id: 'morrisons', name: 'Morrisons', logo: '/Morrisons_Logo.svg', searchUrl: (q) => `https://www.morrisons.com/search?q=${encodeURIComponent(q)}`, offersUrl: 'https://groceries.morrisons.com/promotions' },
  { id: 'marksandspencer', name: 'M&S', logo: '/M&S_Logo.svg', searchUrl: (q) => `https://www.marksandspencer.com/l/search?q=${encodeURIComponent(q)}`, offersUrl: 'https://www.marksandspencer.com/c/food-to-order-offers' },
  { id: 'aldi', name: 'Aldi', logo: '/Aldi_Logo.svg', searchUrl: (q) => `https://www.aldi.co.uk/search?q=${encodeURIComponent(q)}`, offersUrl: 'https://www.aldi.co.uk/offers' },
  { id: 'lidl', name: 'Lidl', logo: '/Lidl_Logo.svg', searchUrl: (q) => `https://www.lidl.co.uk/h/search?q=${encodeURIComponent(q)}`, offersUrl: 'https://www.lidl.co.uk/h/weekly-offers' },
  { id: 'coop', name: 'Co-op', logo: '/Co-op_Logo.svg', searchUrl: (q) => `https://www.coop.co.uk/search?q=${encodeURIComponent(q)}`, offersUrl: 'https://www.coop.co.uk/offers' },
  { id: 'waitrose', name: 'Waitrose', logo: '/Waitrose_Logo.svg', searchUrl: (q) => `https://www.waitrose.com/search?searchTerm=${encodeURIComponent(q)}`, offersUrl: 'https://www.waitrose.com/search?searchTerm=offers' },
  { id: 'iceland', name: 'Iceland', logo: '/Iceland_Logo.svg', searchUrl: (q) => `https://www.iceland.co.uk/search?q=${encodeURIComponent(q)}`, offersUrl: 'https://www.iceland.co.uk/offers' },
  { id: 'ocado', name: 'Ocado', logo: '/Ocado_Logo.svg', searchUrl: (q) => `https://www.ocado.com/search?entry=${encodeURIComponent(q)}`, offersUrl: 'https://www.ocado.com/promotions' },
];
