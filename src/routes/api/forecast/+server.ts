import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { fetchOpenMeteo } from '$lib/fetchers/openmeteo';
import { fetchWeatherAPI } from '$lib/fetchers/weatherapi';

type ForecastHour = {
  time: string;
  temperature: number;
  precip: number;
  windSpeed: number;
  windDir: number;
  condition: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow';
};

type WeatherCondition = ForecastHour['condition'];

type ForecastSource = {
  source: string;
  current: Omit<ForecastHour, 'time'>;
  hourly: ForecastHour[];
  weight: number;
};

function weightedAverage(values: { value: number; weight: number }[]): number {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0);
  return totalWeight === 0
    ? 0
    : values.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}

function weightedWindDirection(sources: ForecastSource[], getDirection: (source: ForecastSource) => number): number {
  const vector = sources.reduce(
    (result, source) => {
      const radians = getDirection(source) * Math.PI / 180;
      result.x += Math.cos(radians) * source.weight;
      result.y += Math.sin(radians) * source.weight;
      return result;
    },
    { x: 0, y: 0 }
  );
  return (Math.atan2(vector.y, vector.x) * 180 / Math.PI + 360) % 360;
}

function weightedCondition(items: { condition: WeatherCondition; weight: number }[]): WeatherCondition {
  const scores = new Map<WeatherCondition, number>();
  for (const item of items) scores.set(item.condition, (scores.get(item.condition) ?? 0) + item.weight);
  return [...scores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'clear';
}

function conditionForProbability(condition: WeatherCondition, precip: number): WeatherCondition {
  if (condition === 'storm' && precip < 40) return 'cloudy';
  if (condition === 'rain' && precip < 20) return 'cloudy';
  return condition;
}

function hourKey(time: string): string {
  return time.replace(' ', 'T').slice(0, 13);
}

async function resolveLocation(url: URL): Promise<{ lat: number; lon: number; name: string }> {
  const latParam = url.searchParams.get('lat');
  const lonParam = url.searchParams.get('lon');
  const lat = Number(latParam);
  const lon = Number(lonParam);

  if (latParam && lonParam && Number.isFinite(lat) && Number.isFinite(lon)) {
    return { lat, lon, name: 'Posizione attuale' };
  }

  const city = url.searchParams.get('city')?.trim() || 'Pisa';
  if (city.toLocaleLowerCase('it-IT') === 'pisa') {
    return { lat: 43.7167, lon: 10.3833, name: 'Pisa, Italia' };
  }

  const geocodingUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
  geocodingUrl.searchParams.set('name', city);
  geocodingUrl.searchParams.set('count', '1');
  geocodingUrl.searchParams.set('language', 'it');
  geocodingUrl.searchParams.set('format', 'json');

  const response = await fetch(geocodingUrl);
  if (!response.ok) throw new Error('Servizio di ricerca città non disponibile');

  const result = await response.json();
  const location = result.results?.[0];
  if (!location) throw new Error(`Città non trovata: ${city}`);

  return {
    lat: location.latitude,
    lon: location.longitude,
    name: [location.name, location.country].filter(Boolean).join(', ')
  };
}

export async function GET({ url }: RequestEvent) {
  try {
    const location = await resolveLocation(url);
    const { lat, lon } = location;

    const results = await Promise.allSettled([
      fetchOpenMeteo(lat, lon),
      fetchWeatherAPI(lat, lon)
    ]);

    const sourceNames = ['Open-Meteo', 'WeatherAPI'];
    const sources: ForecastSource[] = results.flatMap((result, index) => {
      if (result.status === 'fulfilled') return [result.value];

      console.warn(`${sourceNames[index]} non disponibile`);
      return [];
    });

    if (sources.length === 0) {
      return json({ error: 'Nessuna fonte meteo disponibile' }, { status: 503 });
    }

    const temperature = weightedAverage(sources.map((source) => ({
      value: source.current.temperature,
      weight: source.weight
    })));
    const precip = weightedAverage(sources.map((source) => ({
      value: source.current.precip,
      weight: source.weight
    })));
    const windSpeed = weightedAverage(sources.map((source) => ({
      value: source.current.windSpeed,
      weight: source.weight
    })));
    const windDir = weightedWindDirection(sources, (source) => source.current.windDir);
    const currentCondition = conditionForProbability(weightedCondition(sources.map((source) => ({
      condition: source.current.condition,
      weight: source.weight
    }))), precip);

    const hourlyMaps = sources.map((source) => new Map(
      source.hourly.map((hour) => [hourKey(hour.time), hour])
    ));
    const hourly = [...hourlyMaps[0].keys()]
      .filter((time) => hourlyMaps.every((hours) => hours.has(time)))
      .map((time) => {
      const hourValues = hourlyMaps.map((hours) => hours.get(time)!);

      return {
        time: hourValues[0].time.replace(' ', 'T'),
        temperature: weightedAverage(hourValues.map((hour, index) => ({
          value: hour.temperature,
          weight: sources[index].weight
        }))),
        precip: Math.round(weightedAverage(hourValues.map((hour, index) => ({
          value: hour.precip,
          weight: sources[index].weight
        })))),
        windSpeed: weightedAverage(hourValues.map((hour, index) => ({
          value: hour.windSpeed,
          weight: sources[index].weight
        }))),
        windDir: weightedWindDirection(sources, (source) => source.hourly.find((hour) => hourKey(hour.time) === time)!.windDir),
        condition: conditionForProbability(
          weightedCondition(hourValues.map((hour, index) => ({
            condition: hour.condition,
            weight: sources[index].weight
          }))),
          weightedAverage(hourValues.map((hour, index) => ({
            value: hour.precip,
            weight: sources[index].weight
          })))
        )
      };
    });

    return json({
      location: location.name,
      temperature,
      precip,
      windSpeed,
      windDir,
      condition: currentCondition,
      sources,
      hourly
    });

  } catch (err) {
    console.error("ERRORE API FORECAST:", err);
    return json({ error: "Errore nel server meteo" }, { status: 500 });
  }
}
