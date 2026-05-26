import type { RuntimeHistoryPoint } from './runtimeHistory'

export type SignalUpdateMode = 'cyclic' | 'onChange' | 'manualPoll' | 'unknown'

export type SignalUpdatePolicy = {
  field: string
  updateMode: SignalUpdateMode
  expectedIntervalMs: number | null
  stalePolicyMs: number | null
  staleRelevant: boolean
  nivaStaleRelevant: boolean
}

const minuteMs = 60 * 1000
const hourMs = 60 * minuteMs

export function getSignalUpdatePolicy(field: string, source?: string | null): SignalUpdatePolicy {
  const normalizedField = field === 'setpointFeedback' ? 'setpoint' : field
  const normalizedSource = String(source ?? '').toLowerCase()

  if (normalizedSource.includes('manualpoll') || normalizedSource.includes('groupvalueresponse')) {
    return {
      field: normalizedField,
      updateMode: 'manualPoll',
      expectedIntervalMs: null,
      stalePolicyMs: null,
      staleRelevant: false,
      nivaStaleRelevant: false,
    }
  }

  if (normalizedField === 'temperature') {
    return {
      field: normalizedField,
      updateMode: 'cyclic',
      expectedIntervalMs: 30 * minuteMs,
      stalePolicyMs: 120 * minuteMs,
      staleRelevant: true,
      nivaStaleRelevant: true,
    }
  }

  if (normalizedField === 'heatDemand') {
    return {
      field: normalizedField,
      updateMode: 'cyclic',
      expectedIntervalMs: 15 * minuteMs,
      stalePolicyMs: 60 * minuteMs,
      staleRelevant: true,
      nivaStaleRelevant: true,
    }
  }

  if (normalizedField === 'setpoint' || normalizedField === 'mode' || normalizedField === 'modeFeedback') {
    return {
      field: normalizedField,
      updateMode: 'onChange',
      expectedIntervalMs: null,
      stalePolicyMs: 24 * hourMs,
      staleRelevant: false,
      nivaStaleRelevant: false,
    }
  }

  if (
    normalizedField === 'brightness' ||
    normalizedField === 'light' ||
    normalizedField === 'lightFeedback' ||
    normalizedField === 'valueFeedback'
  ) {
    return {
      field: normalizedField,
      updateMode: 'onChange',
      expectedIntervalMs: null,
      stalePolicyMs: 24 * hourMs,
      staleRelevant: false,
      nivaStaleRelevant: false,
    }
  }

  if (normalizedField.startsWith('customSignal:')) {
    return {
      field: normalizedField,
      updateMode: 'unknown',
      expectedIntervalMs: null,
      stalePolicyMs: null,
      staleRelevant: false,
      nivaStaleRelevant: false,
    }
  }

  return {
    field: normalizedField,
    updateMode: 'unknown',
    expectedIntervalMs: null,
    stalePolicyMs: null,
    staleRelevant: false,
    nivaStaleRelevant: false,
  }
}

export function summarizeSignalUpdatePolicies(points: RuntimeHistoryPoint[]) {
  return points.reduce(
    (summary, point) => {
      const policy = getSignalUpdatePolicy(String(point.field), point.source)
      summary.byMode[policy.updateMode] += 1

      if (policy.nivaStaleRelevant) {
        summary.nivaStaleRelevant += 1
      } else if (policy.updateMode === 'onChange') {
        summary.staleSuppressedBecauseOnChange += 1
      }

      return summary
    },
    {
      byMode: {
        cyclic: 0,
        onChange: 0,
        manualPoll: 0,
        unknown: 0,
      } satisfies Record<SignalUpdateMode, number>,
      nivaStaleRelevant: 0,
      staleSuppressedBecauseOnChange: 0,
    },
  )
}
