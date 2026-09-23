function conditionFromCode(code: number): 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' {
  if (code >= 95) return 'storm';
  if (code >= 71 && code <= 86) return 'snow';
  if (code >= 51 && code <= 82) return 'rain';
  if (code >= 1 && code <= 48) return 'cloudy';
  return 'clear';
}

export async function fetchOpenMeteo(lat: number, lon: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,precipitation_probability,wind_speed_10m,wind_direction_10m,weather_code` +
    `&hourly=temperature_2m,precipitation_probability,wind_speed_10m,wind_direction_10m,weather_code` +
    `&daily=sunrise,sunset` +
    `&forecast_days=7&timezone=auto`;

  const res = await fetch(url);
  const data = await res.json();

  const hourly = data.hourly.time.map((t: string, i: number) => ({
    time: t,
    temperature: data.hourly.temperature_2m[i],
    precip: data.hourly.precipitation_probability[i],
    windSpeed: data.hourly.wind_speed_10m[i],
    windDir: data.hourly.wind_direction_10m[i],
    condition: conditionFromCode(data.hourly.weather_code[i]),
    weight: 1
  }));

  return {
    source: 'Open-Meteo',
    sunTimes: data.daily.time.map((date: string, i: number) => ({
      date,
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i]
    })),
    current: {
      temperature: data.current.temperature_2m,
      precip: data.current.precipitation_probability,
      windSpeed: data.current.wind_speed_10m,
      windDir: data.current.wind_direction_10m,
      condition: conditionFromCode(data.current.weather_code)
    },
    hourly,
    weight: 0.4
  };
}
