import { json } from '@sveltejs/kit';

export async function GET({ url }: { url: URL }) {
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ error: 'Coordinate non valide' }, { status: 400 });
  }

  const reverseUrl = new URL('https://nominatim.openstreetmap.org/reverse');
  reverseUrl.searchParams.set('lat', String(lat));
  reverseUrl.searchParams.set('lon', String(lon));
  reverseUrl.searchParams.set('format', 'jsonv2');
  reverseUrl.searchParams.set('zoom', '10');
  reverseUrl.searchParams.set('accept-language', 'it');

  try {
    const response = await fetch(reverseUrl, {
      headers: {
        'User-Agent': 'meteo-mediator/1.0'
      }
    });
    if (!response.ok) return json({ error: 'Località non disponibile' }, { status: 502 });

    const result = await response.json();
    const address = result.address ?? {};
    const name = address.city ?? address.town ?? address.village ?? address.municipality ?? address.county;

    return json({
      name: name ?? result.display_name ?? 'Posizione attuale',
      region: address.state ?? '',
      country: address.country ?? ''
    });
  } catch {
    return json({ error: 'Servizio di localizzazione non disponibile' }, { status: 502 });
  }
}
