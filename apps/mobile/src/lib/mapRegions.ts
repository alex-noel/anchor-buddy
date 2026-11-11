import type { Position } from '@anchor-buddy/domain';

export interface MapRegionPreset {
  id: string;
  name: string;
  continent: 'Europe' | 'Asia' | 'Americas';
  center: Position;
  radiusNm: number;
  timezone: string;
}

/** Map/search starting areas only: these centres are not anchor positions or coverage claims. */
export const MAP_REGIONS: readonly MapRegionPreset[] = [
  {
    id: 'balearics',
    name: 'Palma · Balearic Islands, Spain',
    continent: 'Europe',
    center: [2.65, 39.5],
    radiusNm: 12,
    timezone: 'Europe/Madrid',
  },
  {
    id: 'cote-azur',
    name: 'Antibes · Côte d’Azur, France',
    continent: 'Europe',
    center: [7.15, 43.55],
    radiusNm: 12,
    timezone: 'Europe/Paris',
  },
  {
    id: 'sardinia',
    name: 'Olbia · Sardinia, Italy',
    continent: 'Europe',
    center: [9.6, 40.95],
    radiusNm: 12,
    timezone: 'Europe/Rome',
  },
  {
    id: 'sicily',
    name: 'Syracuse · Sicily, Italy',
    continent: 'Europe',
    center: [15.3, 37.05],
    radiusNm: 10,
    timezone: 'Europe/Rome',
  },
  {
    id: 'adriatic-croatia',
    name: 'Split · Adriatic, Croatia',
    continent: 'Europe',
    center: [16.4, 43.45],
    radiusNm: 15,
    timezone: 'Europe/Zagreb',
  },
  {
    id: 'adriatic-montenegro',
    name: 'Kotor Bay · Montenegro',
    continent: 'Europe',
    center: [18.65, 42.45],
    radiusNm: 10,
    timezone: 'Europe/Podgorica',
  },
  {
    id: 'ionian',
    name: 'Corfu · Ionian Sea, Greece',
    continent: 'Europe',
    center: [19.9, 39.6],
    radiusNm: 12,
    timezone: 'Europe/Athens',
  },
  {
    id: 'aegean',
    name: 'Paros · Aegean Sea, Greece',
    continent: 'Europe',
    center: [25.2, 37.05],
    radiusNm: 15,
    timezone: 'Europe/Athens',
  },
  {
    id: 'turkish-aegean',
    name: 'Bodrum · Aegean coast, Türkiye',
    continent: 'Asia',
    center: [27.4, 37],
    radiusNm: 12,
    timezone: 'Europe/Istanbul',
  },
  {
    id: 'norwegian-coast',
    name: 'Bergen · Norwegian coast, Norway',
    continent: 'Europe',
    center: [5.2, 60.3],
    radiusNm: 12,
    timezone: 'Europe/Oslo',
  },
  {
    id: 'baltic',
    name: 'Stockholm archipelago · Baltic, Sweden',
    continent: 'Europe',
    center: [18.7, 59.3],
    radiusNm: 15,
    timezone: 'Europe/Stockholm',
  },
  {
    id: 'algarve',
    name: 'Lagos · Algarve, Portugal',
    continent: 'Europe',
    center: [-8.65, 37.05],
    radiusNm: 12,
    timezone: 'Europe/Lisbon',
  },
  {
    id: 'solent',
    name: 'Solent · English Channel, United Kingdom',
    continent: 'Europe',
    center: [-1.3, 50.75],
    radiusNm: 12,
    timezone: 'Europe/London',
  },
  {
    id: 'japan-seto',
    name: 'Hiroshima · Seto Inland Sea, Japan',
    continent: 'Asia',
    center: [132.5, 34.2],
    radiusNm: 15,
    timezone: 'Asia/Tokyo',
  },
  {
    id: 'japan-okinawa',
    name: 'Naha · Okinawa, Japan',
    continent: 'Asia',
    center: [127.6, 26.2],
    radiusNm: 12,
    timezone: 'Asia/Tokyo',
  },
  {
    id: 'thailand',
    name: 'Phuket · Andaman Sea, Thailand',
    continent: 'Asia',
    center: [98.4, 7.8],
    radiusNm: 15,
    timezone: 'Asia/Bangkok',
  },
  {
    id: 'malaysia',
    name: 'Langkawi · Malaysia',
    continent: 'Asia',
    center: [99.8, 6.3],
    radiusNm: 12,
    timezone: 'Asia/Kuala_Lumpur',
  },
  {
    id: 'singapore',
    name: 'Singapore Strait · Singapore',
    continent: 'Asia',
    center: [103.85, 1.2],
    radiusNm: 10,
    timezone: 'Asia/Singapore',
  },
  {
    id: 'indonesia',
    name: 'Benoa · Bali, Indonesia',
    continent: 'Asia',
    center: [115.25, -8.75],
    radiusNm: 12,
    timezone: 'Asia/Makassar',
  },
  {
    id: 'hong-kong',
    name: 'Sai Kung · Hong Kong',
    continent: 'Asia',
    center: [114.35, 22.35],
    radiusNm: 10,
    timezone: 'Asia/Hong_Kong',
  },
  {
    id: 'philippines',
    name: 'Cebu & Mactan · Philippines',
    continent: 'Asia',
    center: [124, 10.25],
    radiusNm: 12,
    timezone: 'Asia/Manila',
  },
  {
    id: 'vietnam',
    name: 'Nha Trang · Vietnam',
    continent: 'Asia',
    center: [109.25, 12.2],
    radiusNm: 10,
    timezone: 'Asia/Ho_Chi_Minh',
  },
  {
    id: 'taiwan',
    name: 'Penghu Islands · Taiwan',
    continent: 'Asia',
    center: [119.6, 23.55],
    radiusNm: 12,
    timezone: 'Asia/Taipei',
  },
  {
    id: 'florida-keys',
    name: 'Key West · Florida Keys, United States',
    continent: 'Americas',
    center: [-81.8, 24.55],
    radiusNm: 12,
    timezone: 'America/New_York',
  },
  {
    id: 'bahamas',
    name: 'Nassau · Bahamas',
    continent: 'Americas',
    center: [-77.35, 25.1],
    radiusNm: 12,
    timezone: 'America/Nassau',
  },
];

function searchable(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** A local-only lookup: choosing or filtering presets never needs geocoding or network access. */
export function searchMapRegions(query = '', continent?: MapRegionPreset['continent']) {
  const terms = searchable(query).split(/\s+/).filter(Boolean);
  return MAP_REGIONS.filter((region) => {
    if (continent && region.continent !== continent) return false;
    const text = searchable(`${region.name} ${region.continent}`);
    return terms.every((term) => text.includes(term));
  });
}
