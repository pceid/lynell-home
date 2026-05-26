import { initialHousingConfig } from '../config/systemConfig'

export type WeatherSnapshot = {
  location: string
  condition: string
  temperature: number
  windSpeed: number
  precipitation: number | null
  symbolCode: string
}

const HOME_LOCATION_NAME = initialHousingConfig.name

type MetLocationForecastResponse = {
  properties: {
    timeseries: Array<{
      data: {
        instant: {
          details: {
            air_temperature: number
            wind_speed: number
          }
        }
        next_1_hours?: {
          details?: {
            precipitation_amount?: number
          }
          summary?: {
            symbol_code?: string
          }
        }
      }
    }>
  }
}

export async function getWeather() {
  const response = await fetch(
    `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${initialHousingConfig.latitude}&lon=${initialHousingConfig.longitude}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error('Værdata utilgjengelig')
  }

  const payload = (await response.json()) as MetLocationForecastResponse
  const currentForecast = payload.properties.timeseries[0]

  if (!currentForecast) {
    throw new Error('Mangler værdata')
  }

  const instantDetails = currentForecast.data.instant.details
  const nextHour = currentForecast.data.next_1_hours
  const symbolCode = nextHour?.summary?.symbol_code ?? 'unknown'

  return {
    location: HOME_LOCATION_NAME,
    condition: formatSymbolCode(symbolCode),
    temperature: Math.round(instantDetails.air_temperature),
    windSpeed: Math.round(instantDetails.wind_speed),
    precipitation: nextHour?.details?.precipitation_amount ?? null,
    symbolCode,
  } satisfies WeatherSnapshot
}

function formatSymbolCode(symbolCode: string) {
  return symbolCode
    .replace(/_/g, ' ')
    .replace(/\b(day|night|polartwilight)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (character) => character.toUpperCase())
}
