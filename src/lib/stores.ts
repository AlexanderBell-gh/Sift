export interface Store {
  id: string;
  name: string;
  logo: string;
  searchUrl: (query: string) => string;
}

export const STORES: Store[] = [
  { id: 'tesco', name: 'Tesco', logo: '/Tesco_Logo.svg', searchUrl: (q) => `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(q)}` },
  { id: 'sainsburys', name: "Sainsbury's", logo: '/Sainsbury\'s_Logo.svg', searchUrl: (q) => `https://www.sainsburys.co.uk/gol-ui/SearchResults/${encodeURIComponent(q)}` },
  { id: 'asda', name: 'ASDA', logo: '/ASDA_Logo.svg', searchUrl: (q) => `https://groceries.asda.com/search/${encodeURIComponent(q)}` },
  { id: 'morrisons', name: 'Morrisons', logo: '/Morrisons_Logo.svg', searchUrl: (q) => `https://groceries.morrisons.com/search?q=${encodeURIComponent(q)}` },
  { id: 'marksandspencer', name: 'M&S', logo: '/M&S_Logo.svg', searchUrl: (q) => `https://www.marksandspencer.com/l/search?q=${encodeURIComponent(q)}` },
  { id: 'aldi', name: 'Aldi', logo: '/Aldi_Logo.svg', searchUrl: (q) => `https://www.aldi.co.uk/search?q=${encodeURIComponent(q)}` },
  { id: 'lidl', name: 'Lidl', logo: '/Lidl_Logo.svg', searchUrl: (q) => `https://www.lidl.co.uk/h/search?q=${encodeURIComponent(q)}` },
  { id: 'coop', name: 'Co-op', logo: '/Co-op_Logo.svg', searchUrl: (q) => `https://www.coop.co.uk/search?q=${encodeURIComponent(q)}` },
  { id: 'waitrose', name: 'Waitrose', logo: '/Waitrose_Logo.svg', searchUrl: (q) => `https://www.waitrose.com/search?searchTerm=${encodeURIComponent(q)}` },
  { id: 'iceland', name: 'Iceland', logo: '/Iceland_Logo.svg', searchUrl: (q) => `https://www.iceland.co.uk/search?q=${encodeURIComponent(q)}` },
  { id: 'ocado', name: 'Ocado', logo: '/Ocado_Logo.svg', searchUrl: (q) => `https://www.ocado.com/search?q=${encodeURIComponent(q)}` },
];
