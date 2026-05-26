export type RuntimeHistorySourceCategory =
  | 'liveKnx'
  | 'manualPoll'
  | 'groupValueResponse'
  | 'restoredHistory'
  | 'roomSnapshotReference'
  | 'frontendFallback'
  | 'derivedQuery'
  | 'aggregate'
  | 'demo'
  | 'simulate'
  | 'unknown'

export type RuntimeHistorySourceLike = {
  source?: string | null
  responseSource?: string | null
  restored?: boolean
  persisted?: boolean
}

export const liveRuntimeHistorySourceAllowlist = new Set<RuntimeHistorySourceCategory>([
  'liveKnx',
  'manualPoll',
  'groupValueResponse',
])

export function classifyRuntimeHistorySource(point: RuntimeHistorySourceLike): RuntimeHistorySourceCategory {
  const source = String(point.source ?? '').toLowerCase()
  const responseSource = String(point.responseSource ?? '').toLowerCase()

  if (point.restored || source.includes('restored')) {
    return 'restoredHistory'
  }

  if (responseSource.includes('groupvalueresponse') || source.includes('groupvalueresponse')) {
    return 'groupValueResponse'
  }

  if (source.includes('manualpoll')) {
    return 'manualPoll'
  }

  if (source.includes('knx-subscription') || source.includes('liveknx')) {
    return 'liveKnx'
  }

  if (source.includes('climate-query') || source.includes('query') || source.includes('derived')) {
    return 'derivedQuery'
  }

  if (source.includes('aggregate') || source.includes('summary')) {
    return 'aggregate'
  }

  if (source.includes('snapshot') || source.includes('reference')) {
    return 'roomSnapshotReference'
  }

  if (source.includes('fallback')) {
    return 'frontendFallback'
  }

  if (source.includes('simulate')) {
    return 'simulate'
  }

  if (source.includes('demo')) {
    return 'demo'
  }

  return 'unknown'
}

export function isLiveRuntimeHistoryPoint(point: RuntimeHistorySourceLike) {
  return liveRuntimeHistorySourceAllowlist.has(classifyRuntimeHistorySource(point))
}

export function getRuntimeHistorySourceDistribution<T extends RuntimeHistorySourceLike>(points: T[]) {
  return points.reduce<Record<RuntimeHistorySourceCategory, number>>(
    (distribution, point) => {
      const category = classifyRuntimeHistorySource(point)
      distribution[category] += 1
      return distribution
    },
    {
      liveKnx: 0,
      manualPoll: 0,
      groupValueResponse: 0,
      restoredHistory: 0,
      roomSnapshotReference: 0,
      frontendFallback: 0,
      derivedQuery: 0,
      aggregate: 0,
      demo: 0,
      simulate: 0,
      unknown: 0,
    },
  )
}
