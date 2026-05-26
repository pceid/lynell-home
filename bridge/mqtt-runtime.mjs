const DEFAULT_TOPIC_ROOT = 'zigbee2mqtt'
const MQTT_DEPENDENCY_NAME = 'mqtt'

function readMqttConfigFromEnv(env = process.env) {
  const enabled = String(env.LYNELL_MQTT_ENABLED ?? 'false').toLowerCase() === 'true'
  const host = String(env.LYNELL_MQTT_HOST ?? '').trim()
  const port = Number(env.LYNELL_MQTT_PORT ?? 1883)
  const username = String(env.LYNELL_MQTT_USERNAME ?? '').trim()
  const password = String(env.LYNELL_MQTT_PASSWORD ?? '')
  const topicRoot = String(env.LYNELL_MQTT_TOPIC_ROOT ?? DEFAULT_TOPIC_ROOT).trim() || DEFAULT_TOPIC_ROOT

  return {
    enabled,
    host,
    port: Number.isFinite(port) && port > 0 ? port : 1883,
    username,
    password,
    topicRoot,
  }
}

function createSubscribeTopics(topicRoot) {
  return [
    `${topicRoot}/bridge/state`,
    `${topicRoot}/+/availability`,
    `${topicRoot}/+`,
  ]
}

const TOPIC_STALE_AFTER_MS = 10 * 60_000
const TOPIC_OFFLINE_AFTER_MS = 30 * 60_000

function normalizeMqttMessage(topic, payload, packet = {}) {
  const text = payload?.toString?.('utf8') ?? String(payload ?? '')
  let parsed = null

  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = null
  }

  return {
    topic,
    retained: Boolean(packet.retain),
    receivedAt: new Date().toISOString(),
    payloadPreview: text.length > 180 ? `${text.slice(0, 180)}...` : text,
    json: parsed,
  }
}

export function createMqttRuntime(options = {}) {
  const config = readMqttConfigFromEnv(options.env)
  const subscribedTopics = createSubscribeTopics(config.topicRoot)
  let client = null
  let state = config.enabled ? 'disconnected' : 'disabled'
  let connected = false
  let lastMessage = null
  let lastMessageAt = null
  let error = null
  let connectedAt = null
  let disconnectedAt = null
  let lastSubscribeAt = null
  let subscribeFailures = 0
  let publishFailures = 0
  let reconnectCount = 0
  let messageCount = 0
  const topicStates = new Map()

  function updateTopicState(message) {
    const now = Date.now()
    const current = topicStates.get(message.topic) ?? {
      topicName: message.topic,
      firstSeenAt: message.receivedAt,
      lastLiveAt: null,
      liveMessageCount: 0,
      retainedMessageCount: 0,
    }
    const retained = Boolean(message.retained)

    topicStates.set(message.topic, {
      ...current,
      topicName: message.topic,
      retained,
      retainedOnly: retained && !current.lastLiveAt,
      live: !retained,
      confidence: retained && !current.lastLiveAt ? 'medium' : 'high',
      lastPayload: message.payloadPreview,
      lastUpdate: message.receivedAt,
      lastUpdateMs: now,
      lastLiveAt: retained ? current.lastLiveAt : message.receivedAt,
      liveMessageCount: current.liveMessageCount + (retained ? 0 : 1),
      retainedMessageCount: current.retainedMessageCount + (retained ? 1 : 0),
    })
  }

  function getTopicTrustSnapshot() {
    const now = Date.now()
    const topics = Array.from(topicStates.values())
      .map((topic) => {
        const sourceAgeMs = typeof topic.lastUpdateMs === 'number' ? Math.max(0, now - topic.lastUpdateMs) : null
        const stale = typeof sourceAgeMs === 'number' ? sourceAgeMs > TOPIC_STALE_AFTER_MS : true
        const offline = typeof sourceAgeMs === 'number' ? sourceAgeMs > TOPIC_OFFLINE_AFTER_MS : false

        return {
          topicName: topic.topicName,
          retained: Boolean(topic.retained),
          retainedOnly: Boolean(topic.retainedOnly),
          live: Boolean(topic.live) && !stale,
          stale,
          offline,
          sourceAgeMs,
          lastPayload: topic.lastPayload,
          lastUpdate: topic.lastUpdate,
          confidence: offline ? 'low' : stale || topic.retainedOnly ? 'medium' : topic.confidence,
          liveMessageCount: topic.liveMessageCount,
          retainedMessageCount: topic.retainedMessageCount,
        }
      })
      .sort((a, b) => String(b.lastUpdate ?? '').localeCompare(String(a.lastUpdate ?? '')))

    return {
      staleAfterMs: TOPIC_STALE_AFTER_MS,
      offlineAfterMs: TOPIC_OFFLINE_AFTER_MS,
      topicCount: topics.length,
      liveTopicCount: topics.filter((topic) => topic.live).length,
      retainedOnlyCount: topics.filter((topic) => topic.retainedOnly).length,
      staleTopicCount: topics.filter((topic) => topic.stale).length,
      offlineTopicCount: topics.filter((topic) => topic.offline).length,
      topics: topics.slice(0, 50),
    }
  }

  function getSafeStatus() {
    const topicTrust = getTopicTrustSnapshot()

    return {
      ok: true,
      enabled: config.enabled,
      connected,
      state,
      connectedAt,
      disconnectedAt,
      broker: {
        host: config.host,
        port: config.port,
      },
      topicRoot: config.topicRoot,
      lastMessageAt,
      lastMessage: lastMessage
        ? {
            topic: lastMessage.topic,
            retained: lastMessage.retained,
            receivedAt: lastMessage.receivedAt,
            payloadPreview: lastMessage.payloadPreview,
          }
        : null,
      subscribedTopics,
      subscribed: connected && !error,
      topicTrust,
      reconnectCount,
      messageCount,
      subscribeFailures,
      publishFailures,
      lastSubscribeAt,
      error,
      dependency: MQTT_DEPENDENCY_NAME,
    }
  }

  async function connect() {
    if (!config.enabled) {
      state = 'disabled'
      connected = false
      error = 'MQTT disabled'
      return getSafeStatus()
    }

    if (!config.host) {
      state = 'fallback'
      connected = false
      error = 'MQTT host mangler'
      return getSafeStatus()
    }

    if (client) {
      return getSafeStatus()
    }

    let mqtt

    try {
      mqtt = await import(MQTT_DEPENDENCY_NAME)
    } catch {
      state = 'fallback'
      connected = false
      error = 'MQTT dependency mangler. Installer mqtt-pakken før live runtime kobles.'
      return getSafeStatus()
    }

    state = 'connecting'
    error = null

    const protocol = config.port === 8883 ? 'mqtts' : 'mqtt'
    const url = `${protocol}://${config.host}:${config.port}`
    const nextClient = mqtt.connect(url, {
      username: config.username || undefined,
      password: config.password || undefined,
      reconnectPeriod: 0,
      clientId: `lynell-bridge-${Math.random().toString(16).slice(2)}`,
    })

    client = nextClient

    nextClient.on('connect', () => {
      connected = true
      state = 'connected'
      error = null
      connectedAt = new Date().toISOString()
      nextClient.subscribe(subscribedTopics, (subscribeError) => {
        lastSubscribeAt = new Date().toISOString()
        if (subscribeError) {
          state = 'degraded'
          subscribeFailures += 1
          error = subscribeError.message
        }
      })
    })

    nextClient.on('message', (topic, payload, packet) => {
      lastMessage = normalizeMqttMessage(topic, payload, packet)
      lastMessageAt = lastMessage.receivedAt
      messageCount += 1
      updateTopicState(lastMessage)
    })

    nextClient.on('error', (mqttError) => {
      connected = false
      state = 'degraded'
      error = mqttError?.message ?? String(mqttError)
    })

    nextClient.on('close', () => {
      if (connected) {
        reconnectCount += 1
      }
      connected = false
      state = config.enabled ? 'disconnected' : 'disabled'
      disconnectedAt = new Date().toISOString()
    })

    return getSafeStatus()
  }

  async function disconnect() {
    if (!client) {
      connected = false
      state = config.enabled ? 'disconnected' : 'disabled'
      return getSafeStatus()
    }

    await new Promise((resolve) => {
      client.end(false, {}, resolve)
    })

    client = null
    connected = false
    state = config.enabled ? 'disconnected' : 'disabled'
    disconnectedAt = new Date().toISOString()
    return getSafeStatus()
  }

  return {
    connect,
    disconnect,
    getStatus: getSafeStatus,
    normalizeMqttMessage,
  }
}
