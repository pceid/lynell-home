import type {
  KnxDataType,
  KnxInterpretationRule,
  SystemConfig,
  SystemRoomConfig,
  SystemShadingConfig,
  SystemZoneConfig,
} from '../config/systemConfig'

type MqttDirection = 'state' | 'set'

export type MqttTopicMetadata = {
  address: string
  dataType?: KnxDataType
  interpretationRule?: KnxInterpretationRule
}

export type MqttTopicMatch = {
  topic: string
  direction: MqttDirection
  domain:
    | 'light'
    | 'climate'
    | 'sensor'
    | 'weather'
    | 'shading'
    | 'technical'
    | 'scene'
  field: string
  roomKey?: string
  zoneKey?: string
  metadata: MqttTopicMetadata
}

function slugifySegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function topicJoin(...segments: Array<string | undefined | null>) {
  return segments
    .map((segment) => slugifySegment(segment ?? ''))
    .filter(Boolean)
    .join('/')
}

function getHouseSegment(config: SystemConfig) {
  return slugifySegment(config.housing.name || 'house')
}

function getFloorSegment(config: SystemConfig, room: SystemRoomConfig) {
  const floor = config.floors.find((candidate) => candidate.roomGroup === room.group)
  return slugifySegment(floor?.label || room.group)
}

function getRoomSegment(room: SystemRoomConfig) {
  return slugifySegment(room.name || room.key)
}

function getZoneSegment(zone: SystemZoneConfig) {
  return slugifySegment(zone.name || zone.key)
}

export function getMqttBaseTopic(config: SystemConfig) {
  return topicJoin(config.mqtt.baseTopic || 'lynell')
}

export function getMqttHouseRoot(config: SystemConfig) {
  return topicJoin(getMqttBaseTopic(config), getHouseSegment(config))
}

function getRoomRoot(config: SystemConfig, room: SystemRoomConfig) {
  return topicJoin(getMqttHouseRoot(config), getFloorSegment(config, room), getRoomSegment(room))
}

export function getLightTopics(
  config: SystemConfig,
  room: SystemRoomConfig,
  zone: SystemZoneConfig,
) {
  const root = topicJoin(getRoomRoot(config, room), 'light', getZoneSegment(zone))
  return {
    state: topicJoin(root, 'state'),
    brightness: topicJoin(root, 'brightness'),
    set: topicJoin(root, 'set'),
    brightnessSet: topicJoin(root, 'brightness', 'set'),
  }
}

export function getClimateTopics(config: SystemConfig, room: SystemRoomConfig) {
  const root = topicJoin(getRoomRoot(config, room), 'climate')
  return {
    temperature: topicJoin(root, 'temperature'),
    setpoint: topicJoin(root, 'setpoint'),
    setpointSet: topicJoin(root, 'setpoint', 'set'),
    mode: topicJoin(root, 'mode'),
    heatDemand: topicJoin(root, 'heatDemand'),
  }
}

export function getSensorTopics(config: SystemConfig, room: SystemRoomConfig) {
  const root = getRoomRoot(config, room)
  return {
    presence: topicJoin(root, 'presence'),
    motion: topicJoin(root, 'motion'),
    co2: topicJoin(root, 'co2'),
    humidity: topicJoin(root, 'humidity'),
    lux: topicJoin(root, 'lux'),
    floorTemperature: topicJoin(root, 'floorTemperature'),
  }
}

export function getShadingTopics(
  config: SystemConfig,
  shading: SystemShadingConfig,
  room: SystemRoomConfig | undefined,
) {
  const roomRoot = room
    ? getRoomRoot(config, room)
    : topicJoin(getMqttHouseRoot(config), 'unassigned', slugifySegment(shading.label || shading.id))
  const root = topicJoin(roomRoot, 'shading', slugifySegment(shading.label || shading.id))
  return {
    position: topicJoin(root, 'position'),
    angle: topicJoin(root, 'angle'),
    set: topicJoin(root, 'set'),
  }
}

export function getWeatherTopics(config: SystemConfig) {
  const root = topicJoin(getMqttHouseRoot(config), 'weather')
  return {
    temperature: topicJoin(root, 'temperature'),
    wind: topicJoin(root, 'wind'),
    rain: topicJoin(root, 'rain'),
    lux: topicJoin(root, 'lux'),
  }
}

export function getTechnicalTopics(config: SystemConfig) {
  const root = topicJoin(getMqttHouseRoot(config), 'technical')
  return {
    fire: topicJoin(root, 'fire'),
    waterLeak: topicJoin(root, 'waterLeak'),
    fault: topicJoin(root, 'fault'),
    alarm: topicJoin(root, 'alarm'),
  }
}

export function getSceneTopics(config: SystemConfig) {
  const root = topicJoin(getMqttHouseRoot(config), 'scene')
  return {
    activate: topicJoin(root, 'activate'),
    active: topicJoin(root, 'active'),
  }
}

export function buildMqttTopicMatches(config: SystemConfig): MqttTopicMatch[] {
  const matches: MqttTopicMatch[] = []

  config.rooms.forEach((room) => {
    room.zones.forEach((zone) => {
      const lightTopics = getLightTopics(config, room, zone)

      if (zone.light) {
        matches.push({
          topic: lightTopics.set,
          direction: 'set',
          domain: 'light',
          field: 'light',
          roomKey: room.key,
          zoneKey: zone.key,
          metadata: {
            address: zone.light,
            dataType: zone.lightDataType,
          },
        })
      }

      if (zone.lightFeedback) {
        matches.push({
          topic: lightTopics.state,
          direction: 'state',
          domain: 'light',
          field: 'lightFeedback',
          roomKey: room.key,
          zoneKey: zone.key,
          metadata: {
            address: zone.lightFeedback,
            dataType: zone.lightFeedbackDataType,
            interpretationRule: zone.feedbackInterpretationRule,
          },
        })
      }

      if (zone.value) {
        matches.push({
          topic: lightTopics.brightnessSet,
          direction: 'set',
          domain: 'light',
          field: 'value',
          roomKey: room.key,
          zoneKey: zone.key,
          metadata: {
            address: zone.value,
            dataType: zone.valueDataType,
          },
        })
      }

      if (zone.valueFeedback) {
        matches.push({
          topic: lightTopics.brightness,
          direction: 'state',
          domain: 'light',
          field: 'valueFeedback',
          roomKey: room.key,
          zoneKey: zone.key,
          metadata: {
            address: zone.valueFeedback,
            dataType: zone.valueFeedbackDataType,
            interpretationRule: zone.feedbackInterpretationRule,
          },
        })
      }
    })

    const climateTopics = getClimateTopics(config, room)

    if (room.climate.temperature) {
      matches.push({
        topic: climateTopics.temperature,
        direction: 'state',
        domain: 'climate',
        field: 'temperature',
        roomKey: room.key,
        metadata: {
          address: room.climate.temperature,
          dataType: room.climate.temperatureDataType,
        },
      })
    }

    if (room.climate.setpointFeedback) {
      matches.push({
        topic: climateTopics.setpoint,
        direction: 'state',
        domain: 'climate',
        field: 'setpointFeedback',
        roomKey: room.key,
        metadata: {
          address: room.climate.setpointFeedback,
          dataType: room.climate.setpointFeedbackDataType,
        },
      })
    }

    if (room.climate.setpoint) {
      matches.push({
        topic: climateTopics.setpointSet,
        direction: 'set',
        domain: 'climate',
        field: 'setpoint',
        roomKey: room.key,
        metadata: {
          address: room.climate.setpoint,
          dataType: room.climate.setpointDataType,
        },
      })
    }

    if (room.climate.modeFeedback) {
      matches.push({
        topic: climateTopics.mode,
        direction: 'state',
        domain: 'climate',
        field: 'modeFeedback',
        roomKey: room.key,
        metadata: {
          address: room.climate.modeFeedback,
          dataType: room.climate.modeFeedbackDataType,
        },
      })
    }

    if (room.climate.mode) {
      matches.push({
        topic: climateTopics.mode,
        direction: 'set',
        domain: 'climate',
        field: 'mode',
        roomKey: room.key,
        metadata: {
          address: room.climate.mode,
          dataType: room.climate.modeDataType,
        },
      })
    }

    if (room.climate.heatDemand) {
      matches.push({
        topic: climateTopics.heatDemand,
        direction: 'state',
        domain: 'climate',
        field: 'heatDemand',
        roomKey: room.key,
        metadata: {
          address: room.climate.heatDemand,
          dataType: room.climate.heatDemandDataType,
        },
      })
    }

    if (room.sensors) {
      const sensorTopics = getSensorTopics(config, room)
      ;(
        [
          ['presence', sensorTopics.presence],
          ['motion', sensorTopics.motion],
          ['co2', sensorTopics.co2],
          ['humidity', sensorTopics.humidity],
          ['lux', sensorTopics.lux],
          ['floorTemperature', sensorTopics.floorTemperature],
        ] as const
      ).forEach(([field, topic]) => {
        const point = room.sensors?.[field]

        if (!point?.address) {
          return
        }

        matches.push({
          topic,
          direction: 'state',
          domain: 'sensor',
          field,
          roomKey: room.key,
          metadata: {
            address: point.address,
            dataType: point.dataType,
          },
        })
      })
    }
  })

  config.shading.forEach((shading) => {
    const room = config.rooms.find((candidate) => candidate.key === shading.roomKey)
    const topics = getShadingTopics(config, shading, room)

    if (shading.position) {
      matches.push({
        topic: topics.position,
        direction: 'state',
        domain: 'shading',
        field: 'position',
        roomKey: shading.roomKey,
        zoneKey: shading.id,
        metadata: {
          address: shading.position,
          dataType: shading.positionDataType,
        },
      })
    }

    if (shading.angle) {
      matches.push({
        topic: topics.angle,
        direction: 'state',
        domain: 'shading',
        field: 'angle',
        roomKey: shading.roomKey,
        zoneKey: shading.id,
        metadata: {
          address: shading.angle,
          dataType: shading.angleDataType,
        },
      })
    }

    if (shading.up || shading.down || shading.stop) {
      matches.push({
        topic: topics.set,
        direction: 'set',
        domain: 'shading',
        field: 'set',
        roomKey: shading.roomKey,
        zoneKey: shading.id,
        metadata: {
          address: [shading.up, shading.down, shading.stop].filter(Boolean).join(' | '),
        },
      })
    }
  })

  const weatherTopics = getWeatherTopics(config)
  if (config.weatherStation.outdoorTemperature) {
    matches.push({
      topic: weatherTopics.temperature,
      direction: 'state',
      domain: 'weather',
      field: 'temperature',
      metadata: {
        address: config.weatherStation.outdoorTemperature,
        dataType: config.weatherStation.outdoorTemperatureDataType,
      },
    })
  }
  if (config.weatherStation.wind) {
    matches.push({
      topic: weatherTopics.wind,
      direction: 'state',
      domain: 'weather',
      field: 'wind',
      metadata: {
        address: config.weatherStation.wind,
        dataType: config.weatherStation.windDataType,
      },
    })
  }
  if (config.weatherStation.rain) {
    matches.push({
      topic: weatherTopics.rain,
      direction: 'state',
      domain: 'weather',
      field: 'rain',
      metadata: {
        address: config.weatherStation.rain,
        dataType: config.weatherStation.rainDataType,
      },
    })
  }
  if (config.weatherStation.lux) {
    matches.push({
      topic: weatherTopics.lux,
      direction: 'state',
      domain: 'weather',
      field: 'lux',
      metadata: {
        address: config.weatherStation.lux,
        dataType: config.weatherStation.luxDataType,
      },
    })
  }

  const technicalTopics = getTechnicalTopics(config)
  ;(
    [
      ['waterAlarm', technicalTopics.waterLeak],
      ['fireSignal', technicalTopics.fire],
      ['fault', technicalTopics.fault],
      ['generalAlarm', technicalTopics.alarm],
    ] as const
  ).forEach(([field, topic]) => {
    const point = config.technical[field]

    if (!point.address) {
      return
    }

    matches.push({
      topic,
      direction: 'state',
      domain: 'technical',
      field,
      metadata: {
        address: point.address,
        dataType: point.dataType,
      },
    })
  })

  const sceneTopics = getSceneTopics(config)
  matches.push({
    topic: sceneTopics.activate,
    direction: 'set',
    domain: 'scene',
    field: 'activate',
    metadata: {
      address: '',
    },
  })
  matches.push({
    topic: sceneTopics.active,
    direction: 'state',
    domain: 'scene',
    field: 'active',
    metadata: {
      address: '',
    },
  })

  return matches
}

export function findMqttTopicsForKnxAddress(config: SystemConfig, address: string) {
  const normalizedAddress = address.trim()

  if (!normalizedAddress) {
    return []
  }

  return buildMqttTopicMatches(config).filter((match) => match.metadata.address === normalizedAddress)
}
