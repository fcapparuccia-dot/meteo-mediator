<script lang="ts">
  import { onMount } from 'svelte';
  import clearIcon from '@bybas/weather-icons/production/fill/all/clear-day.svg?raw';
  import clearNightIcon from '@bybas/weather-icons/production/fill/all/clear-night.svg?raw';
  import cloudyIcon from '@bybas/weather-icons/production/fill/all/partly-cloudy-day.svg?raw';
  import cloudyNightIcon from '@bybas/weather-icons/production/fill/all/partly-cloudy-night.svg?raw';
  import rainCloudOneIcon from '$lib/assets/partly-cloudy-rain-1.svg?raw';
  import rainCloudTwoIcon from '$lib/assets/partly-cloudy-rain-2.svg?raw';
  import rainCloudThreeIcon from '$lib/assets/partly-cloudy-rain-3.svg?raw';
  import rainIcon from '@bybas/weather-icons/production/fill/all/rain.svg?raw';
  import snowIcon from '@bybas/weather-icons/production/fill/all/snow.svg?raw';
  import stormIcon from '@bybas/weather-icons/production/fill/all/thunderstorms.svg?raw';
  import stormNightIcon from '@bybas/weather-icons/production/fill/all/thunderstorms-night.svg?raw';

  type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow';

  type WeatherPoint = {
    time: string;
    temperature: number;
    precip: number;
    windSpeed: number;
    windDir: number;
    condition: WeatherCondition;
  };

  type SunTimes = {
    date: string;
    sunrise: string;
    sunset: string;
  };

  type DailyForecast = {
    day: string;
    condition: WeatherCondition;
    minTemperature: number;
    maxTemperature: number;
  };

  type WeatherSource = {
    source: string;
    weight: number;
    current: Omit<WeatherPoint, 'time'>;
    hourly: WeatherPoint[];
  };

  type ForecastData = {
    location: string;
    temperature: number;
    precip: number;
    windSpeed: number;
    windDir: number;
    sunTimes: SunTimes[];
    sources: WeatherSource[];
    hourly: WeatherPoint[];
  };

  type CitySuggestion = {
    id: number;
    name: string;
    country: string;
    region: string;
  };

  let data = $state<ForecastData | null>(null);
  let days = $state<string[]>([]);
  let selectedDay = $state<string | null>(null);
  let error = $state<string | null>(null);
  let city = $state('Pisa');
  let suggestions = $state<CitySuggestion[]>([]);
  let loading = $state(false);
  let suggestionsRequest = 0;

  const weatherIcons: Record<WeatherCondition, string> = {
    clear: clearIcon,
    cloudy: cloudyIcon,
    rain: rainIcon,
    storm: stormIcon,
    snow: snowIcon
  };

  function isNight(time: string): boolean {
    const sun = data?.sunTimes.find((item) => item.date === time.slice(0, 10));
    return Boolean(sun && (time < sun.sunrise || time >= sun.sunset));
  }

  function rainIconForProbability(precip: number): string {
    if (precip <= 20) return cloudyIcon;
    if (precip <= 40) return rainCloudOneIcon;
    if (precip <= 60) return rainCloudTwoIcon;
    return rainCloudThreeIcon;
  }

  function weatherIcon(condition: WeatherCondition, temperature: number, night = false, precip?: number): string {
    if (condition === 'storm') return night ? stormNightIcon : stormIcon;
    if (condition === 'rain' && precip !== undefined) {
      return rainIconForProbability(precip);
    }
    if (night && condition === 'clear') return clearNightIcon;
    if (night && condition === 'cloudy') return cloudyNightIcon;
    if (condition !== 'clear' && condition !== 'cloudy') return weatherIcons[condition];

    return colorizeSun(weatherIcons[condition], temperature);
  }

  function colorizeSun(icon: string, temperature: number): string {
    const colors = temperature <= 5
      ? { main: '#b8e7ff', highlight: '#e7f8ff', edge: '#78c9ef' }
      : temperature <= 10
        ? { main: '#f9e889', highlight: '#fff6b0', edge: '#dfcf61' }
        : temperature <= 15
          ? { main: '#f6dc4d', highlight: '#ffe875', edge: '#d4b72d' }
          : temperature <= 25
            ? { main: '#fbbf24', highlight: '#f59e0b', edge: '#f8af18' }
            : temperature <= 30
              ? { main: '#fb923c', highlight: '#f97316', edge: '#ea580c' }
              : { main: '#ef4444', highlight: '#f87171', edge: '#b91c1c' };
    return icon
      .replaceAll('#fbbf24', colors.main)
      .replaceAll('#f59e0b', colors.highlight)
      .replaceAll('#f8af18', colors.edge);
  }

  async function loadForecast(endpoint: string): Promise<void> {
    loading = true;
    error = null;
    data = null;

    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Risposta non valida dal server');

      const json = await res.json() as ForecastData;
      data = json;

      const uniqueDays = new Set(
        json.hourly.map((h) => h.time.split('T')[0])
      );

      days = Array.from(uniqueDays);
      selectedDay = days[0] ?? null;
    } catch {
      error = 'Non è stato possibile caricare la previsione.';
    } finally {
      loading = false;
    }
  }

  function searchCity(event: SubmitEvent): void {
    event.preventDefault();
    const query = city.trim();
    suggestions = [];
    if (query) void loadForecast(`/api/forecast?city=${encodeURIComponent(query)}`);
  }

  function suggestionLabel(suggestion: CitySuggestion): string {
    return [suggestion.name, suggestion.region, suggestion.country].filter(Boolean).join(', ');
  }

  function selectSuggestedCity(event: Event): void {
    const query = (event.currentTarget as HTMLInputElement).value.trim();
    const selectedSuggestion = suggestions.find((suggestion) => suggestionLabel(suggestion) === query);
    if (!selectedSuggestion) return;

    city = query;
    suggestions = [];
    void loadForecast(`/api/forecast?city=${encodeURIComponent(query)}`);
  }

  async function updateSuggestions(event: Event): Promise<void> {
    const query = (event.currentTarget as HTMLInputElement).value.trim();
    const selectedSuggestion = suggestions.find((suggestion) => suggestionLabel(suggestion) === query);

    if (selectedSuggestion) {
      city = query;
      suggestions = [];
      void loadForecast(`/api/forecast?city=${encodeURIComponent(query)}`);
      return;
    }

    city = query;
    suggestions = [];
    if (query.length < 2) return;

    const requestId = ++suggestionsRequest;
    try {
      const response = await fetch(`/api/locations?q=${encodeURIComponent(query)}`);
      if (!response.ok) return;
      const result = await response.json() as CitySuggestion[];
      if (requestId === suggestionsRequest) suggestions = result;
    } catch {
      suggestions = [];
    }
  }

  function selectCityText(event: MouseEvent): void {
    (event.currentTarget as HTMLInputElement).select();
  }

  function useCurrentLocation(): void {
    if (!navigator.geolocation) {
      error = 'La geolocalizzazione non è supportata da questo browser.';
      return;
    }

    loading = true;
    error = null;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(`/api/locations/reverse?lat=${latitude}&lon=${longitude}`);
          if (response.ok) {
            const location = await response.json() as { name?: string; region?: string };
            city = [location.name, location.region].filter(Boolean).join(', ') || 'Posizione attuale';
          } else {
            city = 'Posizione attuale';
          }
        } catch {
          city = 'Posizione attuale';
        }

        suggestions = [];
        await loadForecast(`/api/forecast?lat=${latitude}&lon=${longitude}`);
      },
      () => {
        loading = false;
        error = 'Posizione non disponibile. Controlla i permessi del browser.';
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  onMount(() => {
    void loadForecast('/api/forecast?city=Pisa');
  });

  function filteredHours(): WeatherPoint[] {
    if (!data || !selectedDay) return [];
    const day = selectedDay;
    const hours = data.hourly.filter((h) => h.time.startsWith(day));
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');

    if (day !== today) return hours;

    return hours.filter((hour) => Number(hour.time.slice(11, 13)) >= now.getHours());
  }

  function dailyForecast(day: string): DailyForecast {
    const hours = data?.hourly.filter((hour) => hour.time.startsWith(day)) ?? [];
    const condition = hours.reduce<WeatherCondition>((dominant, hour) => {
      const counts = hours.filter((item) => item.condition === hour.condition).length;
      const dominantCount = hours.filter((item) => item.condition === dominant).length;
      return counts > dominantCount ? hour.condition : dominant;
    }, 'clear');
    const [year, month, date] = day.split('-').map(Number);
    const weekday = new Intl.DateTimeFormat('it-IT', { weekday: 'short' })
      .format(new Date(year, month - 1, date));

    return {
      day: `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}. ${date}`,
      condition,
      minTemperature: Math.min(...hours.map((hour) => hour.temperature)),
      maxTemperature: Math.max(...hours.map((hour) => hour.temperature))
    };
  }

  function backgroundCondition(): WeatherCondition {
    if (!data || !selectedDay) return 'cloudy';
    return dailyForecast(selectedDay).condition;
  }

  function formatDay(day: string): string {
    const [year, month, date] = day.split('-').map(Number);
    const value = new Date(year, month - 1, date);
    const label = new Intl.DateTimeFormat('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(value);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  // ⭐ Colore dinamico temperatura
  function tempColor(t: number): string {
    if (t >= 30) return '#c2410c';
    if (t >= 25) return '#c2410c';
    if (t >= 20) return '#a16207';
    if (t >= 15) return '#15803d';
    if (t >= 10) return '#166534';
    return '#0369a1';
  }

  // ⭐ Colore precipitazioni
  function precipColor(p: number): string {
    if (p >= 70) return '#b91c1c';
    if (p >= 40) return '#c2410c';
    if (p >= 20) return '#a16207';
    return '#047857';
  }

  // ⭐ Colore vento
  function windColor(w: number): string {
    if (w >= 40) return '#b91c1c';
    if (w >= 25) return '#c2410c';
    if (w >= 15) return '#1d4ed8';
    return '#047857';
  }

  // Freccia della direzione del vento, arrotondata ai punti cardinali.
  function windArrowRotation(dir: number): number {
    // I provider indicano da dove arriva il vento; la freccia mostra dove va.
    const normalizedDirection = (((dir + 180) % 360) + 360) % 360;
    return normalizedDirection - 90;
  }
</script>

<div class="weather-app condition-{backgroundCondition()}">
  <div class="weather-sky" aria-hidden="true">
    <div class="sun"></div>
    <div class="cloud cloud-one"></div>
    <div class="cloud cloud-two"></div>
    <div class="rain-layer"></div>
    <div class="snow-layer"></div>
  </div>

  <section class="location-controls" aria-label="Scegli la località">
    <form onsubmit={searchCity}>
      <label for="city">Città</label>
      <div class="location-form">
        <input
          id="city"
          value={city}
          onclick={selectCityText}
          oninput={updateSuggestions}
          onchange={selectSuggestedCity}
          list="city-suggestions"
          placeholder="Es. Roma"
          autocomplete="off"
        />
        <datalist id="city-suggestions">
          {#each suggestions as suggestion (suggestion.id)}
            <option value={suggestionLabel(suggestion)}></option>
          {/each}
        </datalist>
        <button type="submit" disabled={loading}>Cerca</button>
      </div>
    </form>
    <button type="button" class="location-button" onclick={useCurrentLocation} disabled={loading}>
      Usa la mia posizione
    </button>
  </section>

  {#if error}
    <p role="alert">{error}</p>
  {:else if data === null}
    <p>{loading ? 'Carico la previsione…' : 'Nessuna previsione disponibile.'}</p>
  {:else}
    <section>
      <h2>Previsione oraria per {data.location}</h2>

      <div class="day-selector">
        {#each days as d}
          {@const summary = dailyForecast(d)}
          <button
            type="button"
            class:active={selectedDay === d}
            class="day-pill"
            aria-pressed={selectedDay === d}
            onclick={() => (selectedDay = d)}
          >
            <span class="day-label">{summary.day}</span>
            <span class="weather-icon" aria-hidden="true">{@html weatherIcon(summary.condition, summary.maxTemperature)}</span>
            <span class="day-temperatures">
              <strong>{Math.round(summary.maxTemperature)}°</strong>
              <span>{Math.round(summary.minTemperature)}°</span>
            </span>
          </button>
        {/each}
      </div>
      <p class="swipe-hint">Scorri le schede per vedere gli altri giorni</p>

      <div class="forecast-table-wrapper">
        <table>
          <thead>
            <tr>
              <th style="padding: 8px; border-bottom: 1px solid #ccc;">Ora</th>
              <th style="padding: 8px; border-bottom: 1px solid #ccc;">Icona</th>
              <th style="padding: 8px; border-bottom: 1px solid #ccc;">Temp (°C)</th>
              <th style="padding: 8px; border-bottom: 1px solid #ccc;">Precip (%)</th>
              <th style="padding: 8px; border-bottom: 1px solid #ccc;">Vento (km/h)</th>
              <th style="padding: 8px; border-bottom: 1px solid #ccc;">Vento da</th>
            </tr>
          </thead>

          <tbody>
            {#each filteredHours() as h}
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">
                  {h.time.split('T')[1]}
                </td>

                <td style="padding: 8px; border-bottom: 1px solid #eee;">
                  <span class="weather-icon table-weather-icon" role="img" aria-label={`${h.condition}, probabilità di precipitazione ${h.precip}%`}>{@html weatherIcon(h.condition, h.temperature, isNight(h.time), h.precip)}</span>
                </td>

                <td style="padding: 8px; border-bottom: 1px solid #eee; color: {tempColor(h.temperature)};">
                  {h.temperature.toFixed(1)}
                </td>

                <td style="padding: 8px; border-bottom: 1px solid #eee; color: {precipColor(h.precip)};">
                  {h.precip}
                </td>

                <td style="padding: 8px; border-bottom: 1px solid #eee; color: {windColor(h.windSpeed)};">
                  {h.windSpeed.toFixed(1)}
                </td>

                <td style="padding: 8px; border-bottom: 1px solid #eee;">
                  <span class="wind-arrow" style={`transform: rotate(${windArrowRotation(h.windDir)}deg)`} aria-hidden="true"></span>
                  {Math.round(h.windDir)}°
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <p class="swipe-hint table-hint">Scorri la tabella lateralmente per vedere tutti i dati</p>
    </section>
  {/if}
</div>
<style>
  .weather-app {
    position: relative;
    min-height: 100vh;
    overflow-x: hidden;
    padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
    background: #dcecf7;
    transition: background 0.7s ease;
  }

  .weather-app > :not(.weather-sky) {
    position: relative;
    z-index: 1;
  }

  .weather-sky {
    position: absolute;
    z-index: 0;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    background: linear-gradient(180deg, #a7d8f0 0%, #eaf6fb 100%);
    transition: background 0.7s ease;
  }

  .condition-clear .weather-sky {
    background: linear-gradient(180deg, #55b9ed 0%, #d9f3ff 72%, #f7fcff 100%);
  }

  .condition-cloudy .weather-sky {
    background: linear-gradient(180deg, #8eaabd 0%, #d7e2e7 65%, #f0f4f4 100%);
  }

  .condition-rain .weather-sky,
  .condition-storm .weather-sky {
    background: linear-gradient(180deg, #526b7b 0%, #9aadb7 62%, #d5e0e3 100%);
  }

  .condition-snow .weather-sky {
    background: linear-gradient(180deg, #b5cfe1 0%, #e9f4fa 70%, #ffffff 100%);
  }

  .sun {
    position: absolute;
    top: 3.5rem;
    right: 12%;
    width: 7rem;
    height: 7rem;
    border-radius: 50%;
    background: #ffd166;
    box-shadow: 0 0 3rem rgba(255, 209, 102, 0.65);
    opacity: 0;
    transform: scale(0.8);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }

  .condition-clear .sun {
    opacity: 1;
    transform: scale(1);
    animation: sun-pulse 5s ease-in-out infinite;
  }

  .cloud {
    position: absolute;
    width: 13rem;
    height: 3.5rem;
    border-radius: 4rem;
    background: rgba(255, 255, 255, 0.72);
    filter: blur(0.3px);
    opacity: 0.7;
    animation: cloud-drift 28s linear infinite;
  }

  .cloud::before,
  .cloud::after {
    position: absolute;
    content: '';
    border-radius: 50%;
    background: inherit;
  }

  .cloud::before {
    left: 2.2rem;
    bottom: 1.1rem;
    width: 5rem;
    height: 5rem;
  }

  .cloud::after {
    right: 2rem;
    bottom: 0.7rem;
    width: 4rem;
    height: 4rem;
  }

  .cloud-one {
    top: 9rem;
    left: -14rem;
  }

  .cloud-two {
    top: 18rem;
    left: -20rem;
    transform: scale(0.7);
    animation-duration: 38s;
    animation-delay: -14s;
  }

  .condition-rain .cloud,
  .condition-storm .cloud,
  .condition-snow .cloud {
    background: rgba(230, 239, 243, 0.76);
  }

  .rain-layer,
  .snow-layer {
    position: absolute;
    inset: -20% 0;
    opacity: 0;
    transition: opacity 0.7s ease;
  }

  .rain-layer {
    background-image: repeating-linear-gradient(112deg, transparent 0 2.8rem, rgba(255, 255, 255, 0.36) 2.8rem 2.95rem, transparent 2.95rem 4.5rem);
    background-size: 5rem 7rem;
    animation: rain-fall 0.8s linear infinite;
  }

  .condition-rain .rain-layer,
  .condition-storm .rain-layer {
    opacity: 0.55;
  }

  .snow-layer {
    background-image: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0 0.22rem, transparent 0.28rem), radial-gradient(circle, rgba(255, 255, 255, 0.78) 0 0.14rem, transparent 0.2rem);
    background-position: 0 0, 2rem 3rem;
    background-size: 4rem 4rem, 5rem 5rem;
    animation: snow-fall 7s linear infinite;
  }

  .condition-snow .snow-layer {
    opacity: 0.75;
  }

  .condition-storm .weather-sky {
    animation: storm-flash 8s ease-in-out infinite;
  }

  @keyframes sun-pulse {
    50% { box-shadow: 0 0 4.5rem rgba(255, 209, 102, 0.85); }
  }

  @keyframes cloud-drift {
    from { margin-left: 0; }
    to { margin-left: calc(100vw + 24rem); }
  }

  @keyframes rain-fall {
    from { background-position: 0 0; }
    to { background-position: -1rem 7rem; }
  }

  @keyframes snow-fall {
    from { background-position: 0 0, 2rem 3rem; }
    to { background-position: 2rem 8rem, -1rem 11rem; }
  }

  @keyframes storm-flash {
    0%, 92%, 100% { filter: brightness(1); }
    94% { filter: brightness(1.3); }
    96% { filter: brightness(0.95); }
  }

  .location-controls {
    display: flex;
    align-items: end;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
  }

  .location-controls form {
    display: grid;
    gap: 0.4rem;
  }

  .location-form {
    display: flex;
    gap: 0.5rem;
  }

  .location-form input {
    min-width: 13rem;
    padding: 0.55rem 0.7rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font: inherit;
  }

  .location-form button,
  .location-button {
    padding: 0.55rem 0.8rem;
    border: 1px solid #007aff;
    border-radius: 6px;
    background: #007aff;
    color: white;
    font: inherit;
    cursor: pointer;
  }

  .location-form button:disabled,
  .location-button:disabled {
    cursor: wait;
    opacity: 0.6;
  }

  .day-selector {
    display: flex;
    gap: 0.65rem;
    margin: 1rem 0;
    flex-wrap: wrap;
    max-width: 52.9rem;
  }

  .day-pill {
    appearance: none;
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 0.35rem;
    width: 7rem;
    min-height: 8rem;
    padding: 0.65rem 0.5rem;
    border-radius: 8px;
    border: 1px solid #2d5271;
    font: inherit;
    cursor: pointer;
    user-select: none;
    background: #102f4d;
    color: #eaf3ff;
    text-align: center;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
  }

  .forecast-table-wrapper {
    width: 100%;
    max-width: 52.9rem;
    margin-top: 1rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
  }

  .forecast-table-wrapper table {
    width: 100%;
    min-width: 900px;
    table-layout: fixed;
    border-collapse: collapse;
  }

  .forecast-table-wrapper th,
  .forecast-table-wrapper td {
    box-sizing: border-box;
    text-align: center;
    vertical-align: middle;
    white-space: nowrap;
  }

  .forecast-table-wrapper th:nth-child(1),
  .forecast-table-wrapper td:nth-child(1) { width: 90px; }

  .forecast-table-wrapper th:nth-child(2),
  .forecast-table-wrapper td:nth-child(2) { width: 100px; }

  .forecast-table-wrapper th:nth-child(3),
  .forecast-table-wrapper td:nth-child(3) { width: 150px; }

  .forecast-table-wrapper th:nth-child(4),
  .forecast-table-wrapper td:nth-child(4) { width: 150px; }

  .forecast-table-wrapper th:nth-child(5),
  .forecast-table-wrapper td:nth-child(5) { width: 180px; }

  .forecast-table-wrapper th:nth-child(6),
  .forecast-table-wrapper td:nth-child(6) { width: 180px; }

  .forecast-table-wrapper th:first-child,
  .forecast-table-wrapper td:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
    background: #102f4d !important;
    color: #eaf3ff !important;
  }

  .forecast-table-wrapper th:first-child {
    z-index: 2;
  }

  .swipe-hint {
    display: none;
    margin: -0.5rem 0 0.8rem;
    color: #38566a;
    font-size: 0.75rem;
  }

  .day-pill:hover {
    background: #1d4b70;
    border-color: #527594;
  }

  .day-pill.active {
    background: #007aff;
    color: white;
    border-color: #007aff;
    font-weight: 600;
  }

  .day-label {
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .day-icon {
    align-self: center;
    display: grid;
    place-items: center;
    min-height: 2.5rem;
  }

  .day-temperatures {
    display: flex;
    justify-content: center;
    gap: 0.55rem;
    font-size: 0.9rem;
  }

  .day-temperatures span {
    color: #667085;
  }

  .day-pill.active .day-temperatures span {
    color: #e5efff;
  }

  .weather-icon {
    display: inline-block;
    width: 2.5rem;
    height: 2.5rem;
    vertical-align: middle;
    object-fit: contain;
  }

  .weather-icon :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .table-weather-icon {
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  .wind-arrow {
    position: relative;
    display: inline-block;
    width: 1.35rem;
    height: 0.2rem;
    margin-right: 0.35rem;
    border-radius: 0.2rem;
    background: #0878d1;
    vertical-align: middle;
    transform-origin: 50% 50%;
  }

  .wind-arrow::after {
    position: absolute;
    top: 50%;
    right: -0.05rem;
    content: '';
    border-top: 0.38rem solid transparent;
    border-bottom: 0.38rem solid transparent;
    border-left: 0.52rem solid #0878d1;
    transform: translateY(-50%);
  }

  .weather-app table {
    overflow: hidden;
    border-radius: 8px;
    background: #102f4d;
    box-shadow: 0 0.75rem 2rem rgba(8, 28, 48, 0.28);
    backdrop-filter: blur(8px);
  }

  .weather-app th {
    color: #f4f8ff !important;
    font-weight: 700;
    background: #0b2742;
    border-bottom-color: #527594 !important;
  }

  .weather-app td {
    color: #eaf3ff !important;
    font-weight: 600;
    text-shadow: none;
    border-bottom-color: #2d5271 !important;
  }

  .weather-app tbody tr:nth-child(even) {
    background: #163b5d;
  }

  .weather-app tbody tr:hover {
    background: #1d4b70;
  }

  @media (max-width: 640px) {
    .weather-app {
      padding: max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right)) max(0.75rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left));
    }

    .location-controls {
      align-items: stretch;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .location-controls form,
    .location-form {
      width: 100%;
    }

    .location-form input {
      min-width: 0;
      width: 100%;
    }

    .location-form button,
    .location-button {
      white-space: nowrap;
    }

    .location-button {
      width: 100%;
    }

    h2 {
      font-size: 1.15rem;
    }

    .day-selector {
      max-width: none;
      flex-wrap: nowrap;
      margin-right: -0.75rem;
      padding-right: 0.75rem;
      overflow-x: auto;
      scroll-snap-type: x proximity;
      -webkit-overflow-scrolling: touch;
    }

    .swipe-hint {
      display: block;
    }

    .table-hint {
      margin-top: 0.35rem;
    }

    .day-pill {
      flex: 0 0 5.35rem;
      width: 5.35rem;
      min-height: 6.8rem;
      scroll-snap-align: start;
    }

    .day-label {
      font-size: 0.78rem;
    }

    .day-icon {
      font-size: 1.6rem;
    }

    .forecast-table-wrapper {
      width: calc(100vw - 1.5rem);
      max-width: none;
      margin-right: 0;
      padding-bottom: 0.4rem;
    }

    .forecast-table-wrapper table {
      min-width: 680px;
      font-size: 0.78rem;
    }

    .forecast-table-wrapper th,
    .forecast-table-wrapper td {
      padding: 0.55rem !important;
      white-space: nowrap;
    }
  }
</style>
