const KEY = import.meta.env.VITE_WEATHERAPI_KEY;

function conditionFromCode(code: number): 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' {
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return 'storm';
  if ([1066, 1069, 1072, 1114, 1117, 1168, 1171, 1198, 1201, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1249, 1252, 1255, 1258, 1261, 1264].includes(code)) return 'snow';
  if (code >= 1063 && code <= 1207) return 'rain';
  if (code >= 1003 && code <= 1030) return 'cloudy';
  return 'clear';
}

export async function fetchWeatherAPI(lat: number, lon: number) {
  const url =
    `https://api.weatherapi.com/v1/forecast.json?key=${KEY}&q=${lat},${lon}&days=7`;

  const res = await fetch(url);
  const data = await res.json();

  const hour = data.forecast.forecastday[0].hour[0];

  return {
    source: 'WeatherAPI',
    current: {
      temperature: hour.temp_c,
      precip: hour.chance_of_rain,
      windSpeed: hour.wind_kph,
      windDir: hour.wind_degree,
      condition: conditionFromCode(hour.condition.code)
    },
    hourly: data.forecast.forecastday.flatMap((day: any) =>
      day.hour.map((h: any) => ({
        time: h.time,
        temperature: h.temp_c,
        precip: h.chance_of_rain,
        windSpeed: h.wind_kph,
        windDir: h.wind_degree,
        condition: conditionFromCode(h.condition.code),
        weight: 1
      }))
    ),
    weight: 0.4
  };
}
