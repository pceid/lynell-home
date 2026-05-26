export type AwarenessLayer =
  | 'system'
  | 'weather'
  | 'recommendation'
  | 'comfort'
  | 'occupancy'
  | 'ambience'
  | 'adaptive'
  | 'memory'

export type AwarenessPriorityItem = {
  id: string
  layer: AwarenessLayer
  text: string | null | undefined
  priority?: number
  quietVisible?: boolean
}

export type PrioritizedAwarenessSummary = {
  mainLine: string
  secondaryLines: string[]
  nivaText: string
  selectedLayers: AwarenessLayer[]
}

const layerWeights: Record<AwarenessLayer, number> = {
  system: 100,
  weather: 95,
  recommendation: 82,
  comfort: 76,
  occupancy: 62,
  ambience: 56,
  adaptive: 50,
  memory: 42,
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[.,:;!?]/g, '')
    .replace(/å/g, 'a')
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'o')
    .trim()
}

function getMeaningSignature(value: string) {
  const normalized = normalizeText(value)

  if (normalized.includes('siste kjente') || normalized.includes('signal') || normalized.includes('runtime')) {
    return 'system-confidence'
  }

  if (normalized.includes('vaer') || normalized.includes('regn') || normalized.includes('vind') || normalized.includes('ute')) {
    return 'weather'
  }

  if (normalized.includes('komfort') || normalized.includes('varme') || normalized.includes('temperatur')) {
    return 'comfort'
  }

  if (normalized.includes('aktivitet') || normalized.includes('aktiv') || normalized.includes('omrad')) {
    return 'activity'
  }

  if (normalized.includes('rolig') || normalized.includes('stille') || normalized.includes('dempet')) {
    return 'quiet-mood'
  }

  return normalized.split(' ').slice(0, 5).join(' ')
}

function prepareItems(items: AwarenessPriorityItem[], quietMode: boolean) {
  const seen = new Set<string>()

  return items
    .map((item) => ({
      ...item,
      text: item.text?.trim(),
      score: item.priority ?? layerWeights[item.layer],
    }))
    .filter((item): item is AwarenessPriorityItem & { text: string; score: number } => {
      if (!item.text) {
        return false
      }

      if (
        quietMode &&
        !item.quietVisible &&
        (item.layer !== 'system' || item.score < 80) &&
        (item.layer !== 'weather' || item.score < 80) &&
        (item.layer !== 'comfort' || item.score < 75)
      ) {
        return false
      }

      const signature = getMeaningSignature(item.text)

      if (seen.has(signature)) {
        return false
      }

      seen.add(signature)
      return true
    })
    .sort((a, b) => b.score - a.score || layerWeights[b.layer] - layerWeights[a.layer])
}

export function buildPrioritizedAwarenessSummary({
  items,
  fallback,
  quietMode,
  maxSecondaryLines = 2,
  maxNivaParts = 3,
}: {
  items: AwarenessPriorityItem[]
  fallback: string
  quietMode: boolean
  maxSecondaryLines?: number
  maxNivaParts?: number
}): PrioritizedAwarenessSummary {
  const prepared = prepareItems(items, quietMode)
  const selected = prepared.slice(0, 1 + maxSecondaryLines)
  const mainLine = selected[0]?.text ?? fallback
  const secondaryLines = selected.slice(1).map((item) => item.text)
  const nivaItems = prepared.slice(0, maxNivaParts)
  const nivaText = (nivaItems.length > 0 ? nivaItems.map((item) => item.text) : [fallback]).join(' ')

  return {
    mainLine,
    secondaryLines,
    nivaText,
    selectedLayers: selected.map((item) => item.layer),
  }
}
