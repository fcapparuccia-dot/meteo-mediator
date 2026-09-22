// MOCK MeteoAM realistico per Pisa
export async function fetchMeteoAM(_lat: number, _lon: number) {
  // valori attuali (mock)
  const current = {
    temperature: 22,
    precip: 5,
    windSpeed: 12,
    windDir: 90,
    condition: 'cloudy' as const
  };

  // timeline oraria mock (7 giorni), allineata al giorno corrente
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const hourly = Array.from({ length: 7 * 24 }).map((_, i) => {
    const value = new Date(start);
    value.setHours(start.getHours() + i);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hour = String(value.getHours()).padStart(2, '0');

    return {
      time: `${year}-${month}-${day}T${hour}:00`,
      temperature: 20 + Math.sin(i / 3) * 2,     // variazione morbida
      precip: i % 5 === 0 ? 10 : 5,              // pioggia leggera ogni 5 ore
      windSpeed: 8 + Math.cos(i / 4) * 3,        // vento variabile
      windDir: 80 + i,                           // direzione che cambia lentamente
      condition: (i % 8 === 0 ? 'rain' : 'cloudy') as 'rain' | 'cloudy'
    };
  });

  return {
    source: "MeteoAM",
    weight: 0.2,
    current,
    hourly
  };
}
