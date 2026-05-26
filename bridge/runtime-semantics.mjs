function createSemanticRelationship(type, targetEntityId, metadata = {}) {
  return {
    type,
    targetEntityId,
    ...metadata,
  }
}

function getSemanticRoleForKnxTarget(target) {
  if (target.kind === 'customSignal') {
    return 'diagnosticsSignal'
  }
  if (target.kind === 'climate') {
    if (target.field === 'temperature') {
      return 'passiveSensor'
    }
    if (target.field === 'heatDemand') {
      return 'comfortDemandSignal'
    }
    if (target.field === 'setpointFeedback') {
      return 'primaryClimateController'
    }
    return 'comfortSignal'
  }
  if (target.kind === 'light') {
    return target.field === 'valueFeedback' ? 'comfortLightingLevel' : 'comfortLighting'
  }
  return 'runtimeSignal'
}

function getDomainForKnxTarget(target) {
  if (target.kind === 'climate') {
    return 'climate'
  }
  if (target.kind === 'light') {
    return 'lighting'
  }
  if (target.kind === 'customSignal') {
    return 'diagnostics'
  }
  return 'runtime'
}

function getEntityCapabilitiesForKnxTarget(target) {
  const capabilities = ['readState', 'realtimeEvents', 'persistentHistory', 'subscriptions']
  if (target.kind === 'customSignal') {
    capabilities.push('signalLogging')
  }
  return capabilities
}

function pushSemanticEntity(entities, entity) {
  if (!entity?.entityId) {
    return
  }
  const existingIndex = entities.findIndex((candidate) => candidate.entityId === entity.entityId)
  if (existingIndex >= 0) {
    const existing = entities[existingIndex]
    entities[existingIndex] = {
      ...existing,
      ...entity,
      capabilities: Array.from(new Set([...(existing.capabilities ?? []), ...(entity.capabilities ?? [])])),
      relationships: [...(existing.relationships ?? []), ...(entity.relationships ?? [])],
      tags: Array.from(new Set([...(existing.tags ?? []), ...(entity.tags ?? [])])),
    }
    return
  }
  entities.push(entity)
}

export function buildRuntimeContextGraph(registry, { knxTargets = [] } = {}) {
  const entities = []

  for (const domain of registry.domains ?? []) {
    pushSemanticEntity(entities, {
      entityId: `domain:${domain.domainId}`,
      entityType: 'runtimeService',
      displayName: domain.displayName,
      domainId: domain.domainId,
      roomId: null,
      providerId: 'bridge',
      capabilities: domain.capabilities ?? [],
      relationships: (domain.providers ?? []).map((providerId) =>
        createSemanticRelationship('groupsWith', `provider:${providerId}`),
      ),
      tags: ['domain', domain.category, domain.health],
      semanticRole: domain.approvalHeavy ? 'approvalSensitive' : domain.realtimeCritical ? 'realtimeCritical' : 'domainContext',
      realtime: Boolean(domain.realtimeCritical),
      critical: Boolean(domain.approvalHeavy || domain.realtimeCritical),
      experimental: Boolean(domain.experimental),
    })
  }

  for (const provider of registry.providers ?? []) {
    pushSemanticEntity(entities, {
      entityId: `provider:${provider.providerId}`,
      entityType: 'provider',
      displayName: provider.displayName,
      domainId: provider.domainId,
      roomId: null,
      providerId: provider.providerId,
      capabilities: provider.capabilities,
      relationships: [
        ...provider.domains.map((domainId) => createSemanticRelationship('belongsTo', `domain:${domainId}`)),
        ...provider.runtimeFeatures.map((feature) => createSemanticRelationship('relatedTo', `feature:${feature}`)),
      ],
      tags: ['provider', provider.category, provider.health],
      semanticRole: provider.approvalSensitive ? 'approvalSensitive' : provider.recoveryAware ? 'recoveryAware' : 'providerRuntime',
      realtime: provider.realtime,
      critical: provider.approvalSensitive,
      experimental: provider.experimental,
    })
  }

  for (const service of registry.runtimeServices ?? []) {
    pushSemanticEntity(entities, {
      entityId: `runtimeService:${service.serviceId}`,
      entityType: 'runtimeService',
      displayName: service.displayName,
      domainId: 'runtime',
      roomId: null,
      providerId: 'bridge',
      capabilities: service.capabilities,
      relationships: service.capabilities.map((capability) =>
        createSemanticRelationship('feeds', `capability:${capability}`),
      ),
      tags: ['runtimeService', service.health],
      semanticRole: service.recoveryAware ? 'recoveryAware' : service.realtime ? 'realtimeCritical' : 'runtimeService',
      realtime: service.realtime,
      critical: service.realtime || service.capabilities.includes('executeAction'),
      experimental: false,
    })
  }

  const roomKeys = new Set()
  for (const target of knxTargets) {
    const roomKey = target.roomKey ?? null
    const domainId = getDomainForKnxTarget(target)
    if (roomKey) {
      roomKeys.add(roomKey)
      pushSemanticEntity(entities, {
        entityId: `room:${roomKey}`,
        entityType: 'room',
        displayName: roomKey,
        domainId: 'runtime',
        roomId: roomKey,
        providerId: 'knx',
        capabilities: ['readState', 'realtimeEvents', 'persistentHistory'],
        relationships: [createSemanticRelationship('belongsTo', 'domain:runtime')],
        tags: ['room', 'server-truth'],
        semanticRole: 'homeSpace',
        realtime: true,
        critical: false,
        experimental: false,
      })
    }
    const entityType =
      target.kind === 'climate'
        ? target.field === 'temperature' || target.field === 'heatDemand'
          ? 'sensor'
          : 'climateZone'
        : target.kind === 'light'
          ? target.field === 'lightFeedback'
            ? 'actuator'
            : 'lightZone'
          : 'signal'
    const entityId = `signal:${target.groupAddress}`
    pushSemanticEntity(entities, {
      entityId,
      entityType,
      displayName: target.signalName ?? target.label ?? target.groupAddress,
      domainId,
      roomId: roomKey,
      providerId: 'knx',
      capabilities: getEntityCapabilitiesForKnxTarget(target),
      relationships: [
        roomKey ? createSemanticRelationship('belongsTo', `room:${roomKey}`) : null,
        createSemanticRelationship('monitors', `domain:${domainId}`),
        createSemanticRelationship('dependsOn', 'provider:knx'),
      ].filter(Boolean),
      tags: [
        target.kind,
        target.field,
        target.dpt,
        target.signalCategory ?? null,
      ].filter(Boolean),
      semanticRole: getSemanticRoleForKnxTarget(target),
      realtime: true,
      critical: target.kind === 'climate' && ['temperature', 'heatDemand'].includes(target.field),
      experimental: target.kind === 'customSignal',
      groupAddress: target.groupAddress,
      dpt: target.dpt,
    })
  }

  for (const roomKey of roomKeys) {
    const roomSignals = entities.filter((entity) => entity.roomId === roomKey && entity.entityType !== 'room')
    const roomEntity = entities.find((entity) => entity.entityId === `room:${roomKey}`)
    if (roomEntity) {
      roomEntity.relationships = [
        ...(roomEntity.relationships ?? []),
        ...roomSignals.map((signal) => createSemanticRelationship('feeds', signal.entityId)),
      ]
    }
  }

  const relationships = entities.flatMap((entity) =>
    (entity.relationships ?? []).map((relationship) => ({
      sourceEntityId: entity.entityId,
      ...relationship,
    })),
  )
  const orphanedEntities = entities
    .filter((entity) =>
      !['domain', 'runtimeService'].includes(entity.entityType) &&
      (entity.relationships ?? []).length === 0,
    )
    .map((entity) => entity.entityId)

  return {
    model: 'runtime-context-graph-foundation',
    graphEngine: false,
    database: false,
    generatedAt: new Date().toISOString(),
    entities,
    relationships,
    summary: {
      entityCount: entities.length,
      relationshipCount: relationships.length,
      realtimeCriticalCount: entities.filter((entity) => entity.realtime && entity.critical).length,
      approvalSensitiveCount: entities.filter((entity) => entity.semanticRole === 'approvalSensitive').length,
      orphanedCount: orphanedEntities.length,
      domains: Array.from(new Set(entities.map((entity) => entity.domainId))).filter(Boolean),
      entityTypes: entities.reduce((counts, entity) => {
        counts[entity.entityType] = (counts[entity.entityType] ?? 0) + 1
        return counts
      }, {}),
      semanticRoles: entities.reduce((counts, entity) => {
        counts[entity.semanticRole] = (counts[entity.semanticRole] ?? 0) + 1
        return counts
      }, {}),
    },
    orphanedEntities,
    nivaFutureHook: {
      domainUnderstanding: 'prepared',
      sensorVsActuator: 'prepared',
      criticalityAwareness: 'prepared',
      actionImpactMapping: 'future',
      execution: false,
    },
  }
}
