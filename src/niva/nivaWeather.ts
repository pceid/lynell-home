import type { WeatherSnapshot } from '../api/weatherApi'
import type { NivaWeatherAwareness } from './nivaTypes'

export type WeatherDisplay = {
  label: string
  symbol: string
}

export function getNivaWeatherAwareness({
  weather,
  weatherDisplay,
  weatherUpdatedAt,
  rainAlertThresholdMm,
  windSpeedAlertThresholdMs,
  frostAlertThresholdC,
}: {
  weather: WeatherSnapshot | null
  weatherDisplay: WeatherDisplay | null
  weatherUpdatedAt: number | null
  rainAlertThresholdMm: number
  windSpeedAlertThresholdMs: number
  frostAlertThresholdC: number
}): NivaWeatherAwareness {
  if (!weather || !weatherDisplay) {
    return {
      current: null,
      forecastToday: null,
      forecastTomorrow: null,
      updatedAt: weatherUpdatedAt,
      source: 'unavailable',
      alert: null,
    }
  }

  const rainAmount = weather.precipitation ?? null
  const rainExpected = typeof rainAmount === 'number' && rainAmount >= rainAlertThresholdMm
  const current = {
    temperature: weather.temperature,
    windSpeed: weather.windSpeed,
    windGust: null,
    rainAmount,
    rainExpected,
    weatherText: weatherDisplay.label,
    symbol: weatherDisplay.symbol,
  }
  const alert =
    current.windSpeed >= windSpeedAlertThresholdMs
      ? {
          key: `wind:${Math.round(current.windSpeed)}`,
          message: 'Det kan blåse opp. Husk å sikre løse gjenstander.',
          tone: 'warning' as const,
        }
      : current.rainExpected
        ? {
            key: `rain:${Math.round((current.rainAmount ?? 0) * 10)}`,
            message: 'Det er meldt regn i nærmeste varsel.',
            tone: 'active' as const,
          }
        : current.temperature <= frostAlertThresholdC
          ? {
              key: `frost:${Math.round(current.temperature)}`,
              message: 'Det er kaldt ute. Vær obs på frost.',
              tone: 'active' as const,
            }
          : null

  return {
    current,
    forecastToday: {
      rainExpected: current.rainExpected,
      rainAmount: current.rainAmount,
      windSpeed: current.windSpeed,
      windGust: current.windGust,
      weatherText: current.weatherText,
    },
    forecastTomorrow: {
      rainExpected: null,
      rainAmount: null,
      windSpeed: null,
      windGust: null,
      temperature: null,
      weatherText: 'Morgendata er ikke hentet ennå.',
    },
    updatedAt: weatherUpdatedAt,
    source: 'live',
    alert,
  }
}
