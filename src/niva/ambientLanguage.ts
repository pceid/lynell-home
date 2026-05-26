import type { RuntimeConnectionState, RuntimeReadinessState } from '../integrations/runtime/integrationRuntimeState'

export type AmbientTone = 'live' | 'calm' | 'watch' | 'quiet' | 'developer'

export const ambientRuntimeCopy = {
  homeActive: 'Hjemmet er aktivt',
  systemsAvailable: 'Systemene er tilgjengelige',
  preparing: 'Forbereder',
  quiet: 'Stille',
  lastKnown: 'Siste kjente rytme',
  gentleWatch: 'Oppfølging',
  needsAttention: 'Trenger oppfølging',
  developerInsight: 'Runtime Insight',
} as const

export function getAmbientRuntimeModeDescription(mode: 'live' | 'demo' | 'developer') {
  if (mode === 'demo') {
    return 'Demo Mode bruker eksempeldata uten hardware.'
  }

  if (mode === 'developer') {
    return 'Developer Mode viser foundation, readiness og Runtime Insight.'
  }

  return 'Live Mode prioriterer ekte runtime og holder demo/foundation adskilt.'
}

export function formatAmbientConnectionState(state: RuntimeConnectionState) {
  const labels: Record<RuntimeConnectionState, string> = {
    connected: 'Active',
    degraded: 'Watch',
    offline: 'Unavailable',
    demo: 'Demo',
    developer: 'Developer',
    foundation: 'Prepared',
    fallback: 'Last known',
    loading: 'Preparing',
  }

  return labels[state]
}

export function formatAmbientReadinessState(readiness: RuntimeReadinessState) {
  const labels: Record<RuntimeReadinessState, string> = {
    live: 'Live',
    ready: 'Ready',
    limited: 'Watch',
    missingConfig: 'Needs setup',
    disabled: 'Unavailable',
    diagnostic: 'Runtime Insight',
  }

  return labels[readiness]
}

export function formatAmbientMediaState(isPlaying: boolean, route: 'cast' | 'local') {
  if (!isPlaying) {
    return ambientRuntimeCopy.quiet
  }

  return route === 'cast' ? 'Playing on Cast' : 'Playing here'
}

export function formatAmbientDeviceState(state: 'available' | 'preparing' | 'quiet' | 'unavailable') {
  const labels = {
    available: ambientRuntimeCopy.systemsAvailable,
    preparing: ambientRuntimeCopy.preparing,
    quiet: ambientRuntimeCopy.quiet,
    unavailable: 'Ikke tilgjengelig',
  }

  return labels[state]
}

export function getAmbientToneForRuntime(state: RuntimeConnectionState): AmbientTone {
  if (state === 'connected') {
    return 'live'
  }

  if (state === 'degraded' || state === 'fallback' || state === 'loading') {
    return 'watch'
  }

  if (state === 'demo' || state === 'developer' || state === 'foundation') {
    return 'developer'
  }

  return 'quiet'
}
