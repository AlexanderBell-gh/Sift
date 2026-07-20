import type { ExtractedProduct } from '../types';

interface JsonLdOffer {
  '@type': string;
  price?: string;
  priceCurrency?: string;
  url?: string;
}

interface JsonLdProduct {
  '@type': string;
  name?: string;
  image?: string | string[];
  sku?: string;
  gtin13?: string;
  brand?: { name?: string };
  offers?: JsonLdOffer | JsonLdOffer[];
  description?: string;
}

function parsePrice(text: string | undefined | null): number | null {
  if (!text) return null;
  const match = text.replace(/,/g, '').match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
}

function getText(selectors: string[]): string | null {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el?.textContent?.trim()) return el.textContent.trim();
  }
  return null;
}

function getAttr(selectors: string[], attr: string): string | null {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    const val = el?.getAttribute(attr);
    if (val) return val;
  }
  return null;
}

function extractFromJsonLd(): Partial<ExtractedProduct> | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      if (data['@type'] === 'Product') {
        const product = data as JsonLdProduct;
        const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
        const image = Array.isArray(product.image) ? product.image[0] : product.image;
        return {
          name: product.name || null,
          price: parsePrice(offers?.price),
          image_url: image || null,
          product_url: offers?.url || window.location.href,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractFromDom(): Partial<ExtractedProduct> {
  const priceText = getText([
    '[data-auto="price-per-quantity-weight"]',
    '.price-main__integer',
    '.product-price',
    '.pt__cost__retail-price',
    '[data-testid="product-tile-price"]',
  ]);

  const wasPriceText = getText([
    '[data-auto="was-price"]',
    '.price--was',
    '.product-price--previous',
    '.pt__cost__retail-price--was',
    '[data-testid="was-price"]',
  ]);

  const loyaltyPriceText = getText([
    '[data-auto="clubcard-price"]',
    '.price--clubcard',
    '.clubcard-price',
    '[data-testid="clubcard-price"]',
    '.nectar-offer',
  ]);

  const offerBadge = getText([
    '[data-auto="promotion-badge"]',
    '.promotions__badge',
    '.offer-text',
    '.promotion-banner',
    '[data-testid="promotion-badge"]',
  ]);

  const imageUrl = getAttr([
    'img[data-auto="product-image"]',
    '.product-image img',
    'img[src*="digitalcontent.api.tesco.com"]',
    '[data-testid="product-tile-image"] img',
  ], 'src');

  const title = getText([
    'h1',
    '[data-auto="product-title"]',
    '[data-testid="product-tile-title"]',
  ]);

  return {
    name: title,
    price: parsePrice(priceText),
    was_price: parsePrice(wasPriceText),
    loyalty_price: parsePrice(loyaltyPriceText),
    offer_badge: offerBadge,
    image_url: imageUrl,
    product_url: window.location.href,
  };
}

function detectStore(): { id: string; name: string; logo: string } | null {
  const hostname = window.location.hostname;
  if (hostname.includes('tesco.com')) {
    return { id: 'tesco', name: 'Tesco', logo: '/icons/tesco.svg' };
  }
  if (hostname.includes('sainsburys.co.uk')) {
    return { id: 'sainsburys', name: "Sainsbury's", logo: '/icons/sainsburys.svg' };
  }
  if (hostname.includes('asda.com')) {
    return { id: 'asda', name: 'ASDA', logo: '/icons/asda.svg' };
  }
  if (hostname.includes('morrisons.com')) {
    return { id: 'morrisons', name: 'Morrisons', logo: '/icons/morrisons.svg' };
  }
  if (hostname.includes('marksandspencer.com')) {
    return { id: 'marksandspencer', name: 'M&S', logo: '/icons/mns.svg' };
  }
  if (hostname.includes('aldi.co.uk')) {
    return { id: 'aldi', name: 'Aldi', logo: '/icons/aldi.svg' };
  }
  if (hostname.includes('lidl.co.uk')) {
    return { id: 'lidl', name: 'Lidl', logo: '/icons/lidl.svg' };
  }
  if (hostname.includes('coop.co.uk')) {
    return { id: 'coop', name: 'Co-op', logo: '/icons/coop.svg' };
  }
  if (hostname.includes('waitrose.com')) {
    return { id: 'waitrose', name: 'Waitrose', logo: '/icons/waitrose.svg' };
  }
  if (hostname.includes('iceland.co.uk')) {
    return { id: 'iceland', name: 'Iceland', logo: '/icons/iceland.svg' };
  }
  if (hostname.includes('ocado.com')) {
    return { id: 'ocado', name: 'Ocado', logo: '/icons/ocado.svg' };
  }
  return null;
}

export function extractProduct(): ExtractedProduct | null {
  const store = detectStore();
  if (!store) return null;

  const jsonLd = extractFromJsonLd();
  const dom = extractFromDom();

  return {
    name: dom.name || jsonLd?.name || null,
    price: jsonLd?.price ?? dom.price ?? null,
    loyalty_price: dom.loyalty_price ?? null,
    was_price: dom.was_price ?? null,
    offer_badge: dom.offer_badge ?? null,
    image_url: jsonLd?.image_url ?? dom.image_url ?? null,
    product_url: jsonLd?.product_url || dom.product_url || window.location.href,
    store: store.id,
    store_logo: store.logo,
    unit: null,
    currency: 'GBP',
  };
}
