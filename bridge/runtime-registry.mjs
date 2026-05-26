import { sensitiveRuntimeCapabilities } from './runtime-domains.mjs'

export function getRuntimeProviderCapabilityClarity(provider) {
  const maturityByProvider = {
    bridge: 'liveRuntime',
    knx: 'liveRuntime',
    cast: 'liveRuntime',
    dreameCloud: 'statusOnly',
    mqtt: 'statusOnly',
    cameraNvr: 'foundation',
    homeAssistantBridge: 'foundation',
    deltacoTuya: 'foundation',
    energyMeter: 'foundation',
    sonos: 'future',
    deco: 'future',
    mill: 'future',
    namron: 'future',
  }
  const maturity = maturityByProvider[provider] ?? 'foundation'
  const foundationOnly = ['foundation', 'prepared', 'mock', 'future'].includes(maturity)
  const supportsWrite = ['bridge', 'knx', 'cast'].includes(provider)
  const sendsCommands = ['knx', 'cast'].includes(provider)
  const supportsDiscovery = ['cast', 'deltacoTuya', 'cameraNvr'].includes(provider)
  const runtimeConnected = ['bridge', 'knx'].includes(provider)
  const energyFoundation = provider === 'energyMeter'
  const cameraFoundation = provider === 'cameraNvr'

  return {
    maturity,
    supportsRead: energyFoundation || cameraFoundation || !['sonos', 'deco', 'mill', 'namron'].includes(provider),
    supportsWrite,
    supportsDiscovery,
    supportsLifecycle: !['bridge', 'knx'].includes(provider),
    sendsCommands,
    requiresCredentials: ['dreameCloud', 'homeAssistantBridge', 'mqtt'].includes(provider) || energyFoundation || cameraFoundation,
    runtimeConnected,
    foundationOnly,
    controlAvailable: supportsWrite && sendsCommands && !foundationOnly,
    realtime: ['bridge', 'knx', 'cast', 'mqtt'].includes(provider),
    supportsLivePower: false,
    supportsHourlyConsumption: false,
    supportsSpotPrice: energyFoundation ? 'foundation' : false,
    providerCandidates: energyFoundation
      ? ['fortum', 'hanPort', 'elhub', 'nordpool']
      : cameraFoundation
        ? ['rtsp', 'onvif', 'tapoFoundation', 'genericIpCamera']
        : [],
  }
}

export function getProviderManifestCapabilities(provider, domain) {
  const baseCapabilities = new Set(domain.capabilities ?? [])
  const clarity = getRuntimeProviderCapabilityClarity(provider)
  if (provider === 'deltacoTuya') {
    baseCapabilities.add('polling')
    baseCapabilities.add('persistentHistory')
  }
  if (provider === 'bridge') {
    baseCapabilities.add('realtimeEvents')
    baseCapabilities.add('persistentHistory')
  }
  if (provider === 'energyMeter') {
    baseCapabilities.add('readState')
    baseCapabilities.add('persistentHistory')
    baseCapabilities.add('diagnosticsAccess')
    baseCapabilities.add('proposeAction')
    baseCapabilities.delete('providerLifecycle')
  }
  if (provider === 'cameraNvr') {
    baseCapabilities.add('readState')
    baseCapabilities.add('diagnosticsAccess')
    baseCapabilities.add('persistentHistory')
    baseCapabilities.delete('writeState')
    baseCapabilities.delete('executeAction')
    baseCapabilities.delete('providerLifecycle')
  }
  if (!clarity.supportsRead) {
    baseCapabilities.delete('readState')
  }
  if (!clarity.supportsWrite) {
    baseCapabilities.delete('writeState')
  }
  if (!clarity.sendsCommands) {
    baseCapabilities.delete('executeAction')
  }
  if (!clarity.realtime) {
    baseCapabilities.delete('realtimeEvents')
  }
  return Array.from(baseCapabilities)
}

export function getRuntimeProviderManifests(domainsSnapshot) {
  const healthRank = {
    healthy: 0,
    experimental: 1,
    degraded: 2,
    offline: 3,
    disabled: 4,
    failed: 5,
    unknown: 2,
  }
  const mergeProviderHealth = (currentHealth, nextHealth) => {
    if (!currentHealth) {
      return nextHealth
    }
    return (healthRank[nextHealth] ?? healthRank.unknown) > (healthRank[currentHealth] ?? healthRank.unknown)
      ? nextHealth
      : currentHealth
  }
  const manifestsByProvider = new Map()
  for (const domain of domainsSnapshot.domains) {
    for (const provider of domain.providers ?? []) {
      const current = manifestsByProvider.get(provider)
      const clarity = getRuntimeProviderCapabilityClarity(provider)
      const capabilities = new Set(current?.capabilities ?? [])
      for (const capability of getProviderManifestCapabilities(provider, domain)) {
        capabilities.add(capability)
      }
      const runtimeFeatures = new Set(current?.runtimeFeatures ?? [])
      if (domain.realtimeCritical) {
        runtimeFeatures.add('realtime-events')
      }
      if (domain.approvalHeavy) {
        runtimeFeatures.add('approval-aware')
      }
      if (domain.capabilities.includes('persistentHistory')) {
        runtimeFeatures.add('persistent-history')
      }
      if (domain.capabilities.includes('signalLogging')) {
        runtimeFeatures.add('signal-logging')
      }
      manifestsByProvider.set(provider, {
        ...clarity,
        providerId: provider,
        displayName: provider === 'knx'
          ? 'KNX Runtime'
          : provider === 'bridge'
            ? 'Lynell Bridge'
            : provider === 'energyMeter'
              ? 'Energy Meter Foundation'
              : provider === 'cameraNvr'
                ? 'Camera / NVR Foundation'
              : provider,
        domainId: current?.domainId ?? domain.domainId,
        domains: Array.from(new Set([...(current?.domains ?? []), domain.domainId])),
        category: provider === 'energyMeter' ? 'utility/energy' : provider === 'cameraNvr' ? 'security/camera' : domain.category,
        capabilities: Array.from(capabilities),
        runtimeFeatures: Array.from(runtimeFeatures),
        health: clarity.foundationOnly
          ? clarity.maturity === 'future'
            ? 'disabled'
            : 'experimental'
          : mergeProviderHealth(current?.health, domain.health),
        enabled: Boolean((current?.enabled || domain.enabled) && clarity.maturity !== 'future'),
        experimental: Boolean(current?.experimental || domain.experimental || clarity.foundationOnly),
        realtime: Boolean(current?.realtime || (domain.realtimeCritical && clarity.realtime)),
        approvalSensitive: Boolean(current?.approvalSensitive || domain.approvalHeavy),
        persistenceAware: Boolean(current?.persistenceAware || domain.capabilities.includes('persistentHistory')),
        recoveryAware: ['bridge', 'knx', 'dreameCloud', 'homeAssistantBridge', 'cast', 'mqtt', 'deltacoTuya', 'energyMeter', 'cameraNvr'].includes(provider),
        version: 'foundation',
        runtimeOwner: domain.runtimeOwner,
      })
    }
  }
  return Array.from(manifestsByProvider.values()).sort((a, b) => a.providerId.localeCompare(b.providerId))
}

export function getCapabilityMatrix(providerManifests, domainsSnapshot) {
  const capabilities = Array.from(
    new Set([
      ...domainsSnapshot.domains.flatMap((domain) => domain.capabilities ?? []),
      ...providerManifests.flatMap((provider) => provider.capabilities ?? []),
    ]),
  ).sort()
  return capabilities.map((capability) => ({
    capability,
    sensitive: sensitiveRuntimeCapabilities.has(capability),
    providers: providerManifests
      .filter((provider) => provider.capabilities.includes(capability))
      .map((provider) => provider.providerId),
    domains: domainsSnapshot.domains
      .filter((domain) => domain.capabilities.includes(capability))
      .map((domain) => domain.domainId),
  }))
}
