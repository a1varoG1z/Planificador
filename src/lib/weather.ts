/**
 * Clima real de la ubicacion de un jardin, via Open-Meteo (gratis, sin API key).
 * Se usa solo para el aviso de calor extra en el riego; si falla por lo que sea
 * (ubicacion no reconocida, servicio caido...) se ignora sin romper la pagina.
 */
export interface GardenWeather {
  currentTempC: number;
  maxTempTodayC: number;
}

async function geocodeLocation(location: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const city = location.split(',')[0].trim();
    if (!city) return null;
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=es&format=json`,
      { next: { revalidate: 86_400 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const first = data.results?.[0];
    if (!first) return null;
    return { latitude: first.latitude, longitude: first.longitude };
  } catch {
    return null;
  }
}

export async function getGardenWeather(location: string): Promise<GardenWeather | null> {
  try {
    const geo = await geocodeLocation(location);
    if (!geo) return null;

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m&daily=temperature_2m_max&timezone=auto&forecast_days=1`,
      { next: { revalidate: 1_800 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const currentTempC = data.current?.temperature_2m;
    const maxTempTodayC = data.daily?.temperature_2m_max?.[0];
    if (typeof currentTempC !== 'number' || typeof maxTempTodayC !== 'number') return null;
    return { currentTempC, maxTempTodayC };
  } catch {
    return null;
  }
}
