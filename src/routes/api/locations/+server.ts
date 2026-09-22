import { json } from '@sveltejs/kit';

export async function GET({ url }: { url: URL }) {
  const query = url.searchParams.get('q')?.trim();
  if (!query || query.length < 2) return json([]);

  const geocodingUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
  geocodingUrl.searchParams.set('name', query);
  geocodingUrl.searchParams.set('count', '8');
  geocodingUrl.searchParams.set('language', 'it');
  geocodingUrl.searchParams.set('countryCode', 'IT');
  geocodingUrl.searchParams.set('format', 'json');

  try {
    const response = await fetch(geocodingUrl);
    if (!response.ok) return json([]);

    const result = await response.json();
    return json((result.results ?? []).map((location: {
      id: number;
      name: string;
      country?: string;
      admin1?: string;
    }) => ({
      id: location.id,
      name: location.name,
      country: location.country ?? '',
      region: location.admin1 ?? ''
    })));
  } catch {
    return json([]);
  }
}
