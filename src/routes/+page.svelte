<script lang="ts">
  import { onMount } from 'svelte';

  type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow';

  type WeatherPoint = {
    time: string;
    temperature: number;
    precip: number;
    windSpeed: number;
    windDir: number;
    condition: WeatherCondition;
  };

  type DailyForecast = {
    day: string;
    icon: string;
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

  async function updateSuggestions(event: Event): Promise<void> {
    const query = (event.currentTarget as HTMLInputElement).value.trim();
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
      (position) => {
        void loadForecast(`/api/forecast?lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
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
    return data.hourly.filter((h) => h.time.startsWith(day));
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
      icon: iconForCondition(condition),
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

  // Icone meteo basate sulla condizione normalizzata dai provider.
  function iconFor(h: WeatherPoint): string {
    const icons: Record<WeatherCondition, string> = {
      clear: '☀️',
      cloudy: '☁️',
      rain: '🌧️',
      storm: '⛈️',
      snow: '❄️'
    };
    return icons[h.condition];
  }

  function iconForCondition(condition: WeatherCondition): string {
    return iconFor({
      time: '',
      temperature: 0,
      precip: 0,
      windSpeed: 0,
      windDir: 0,
      condition
    });
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
  function windArrow(dir: number): string {
    const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
    const normalizedDirection = ((dir % 360) + 360) % 360;
    const arrowIndex = Math.round(normalizedDirection / 45) % arrows.length;
    return arrows[arrowIndex];
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
          list="city-suggestions"
          placeholder="Es. Roma"
          autocomplete="off"
        />
        <datalist id="city-suggestions">
          {#each suggestions as suggestion (suggestion.id)}
            <option value={[suggestion.name, suggestion.region, suggestion.country].filter(Boolean).join(', ')}></option>
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
            <span class="day-icon" aria-hidden="true">{summary.icon}</span>
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
              <th style="padding: 8px; border-bottom: 1px solid #ccc;">Direzione</th>
            </tr>
          </thead>

          <tbody>
            {#each filteredHours() as h}
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">
                  {h.time.split('T')[1]}
                </td>

                <td style="padding: 8px; border-bottom: 1px solid #eee;">
                  {iconFor(h)}
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
                  {windArrow(h.windDir)} {Math.round(h.windDir)}°
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
    border: 1px solid #ccc;
    font: inherit;
    cursor: pointer;
    user-select: none;
    background: #f7f7f7;
    color: #333;
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
    border-collapse: collapse;
  }

  .forecast-table-wrapper th:first-child,
  .forecast-table-wrapper td:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
    background: rgba(255, 255, 255, 0.96);
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
    background: #eaeaea;
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
    font-size: 2rem;
    line-height: 1;
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

  .weather-app table {
    overflow: hidden;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 0.75rem 2rem rgba(22, 45, 61, 0.14);
    backdrop-filter: blur(8px);
  }

  .weather-app th {
    color: #183244;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.96);
  }

  .weather-app td {
    font-weight: 600;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.85);
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
