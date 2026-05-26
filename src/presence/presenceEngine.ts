import type {
  HousePresence,
  HousePresenceInput,
  HousePresenceState,
  PresenceTimeBucket,
} from './presenceTypes'

function getTimeBucket(hour: number): PresenceTimeBucket {
  if (hour >= 23 || hour < 6) {
    return 'night'
  }

  if (hour >= 18) {
    return 'evening'
  }

  if (hour < 11) {
    return 'morning'
  }

  return 'day'
}

function getAverageBrightness(input: HousePresenceInput) {
  const litRooms = input.rooms.filter((room) => room.lightsOn > 0)

  if (litRooms.length === 0) {
    return 0
  }

  const total = litRooms.reduce((sum, room) => sum + room.averageBrightness, 0)
  return Math.round(total / litRooms.length)
}

function getActiveRoomNames(input: HousePresenceInput) {
  return Array.from(new Set([
    ...input.rooms
    .filter((room) => room.lightsOn > 0 || (room.heatDemand ?? 0) > 25)
    .sort((a, b) => b.lightsOn - a.lightsOn)
    .map((room) => room.name),
    ...(input.sensors?.activeRoomNames ?? []),
  ])).slice(0, 3)
}

function getPresenceLabel(state: HousePresenceState) {
  switch (state) {
    case 'away':
      return 'Borte og stille'
    case 'empty':
      return 'Huset virker tomt akkurat nå'
    case 'storm':
      return 'Vær i fokus'
    case 'night':
      return 'Nattmodus og stille'
    case 'lateActivity':
      return 'Sen kveld med aktivitet'
    case 'darkQuiet':
      return 'Mørkt og stille inne'
    case 'rainQuietEvening':
      return 'Regnfull og dempet kveld'
    case 'quietEvening':
      return 'Stille kveld hjemme'
    case 'evening':
      return 'Stille kveld hjemme'
    case 'cozy':
      return 'Lun stemning hjemme'
    case 'focus':
      return 'Fokus i huset'
    case 'activeAfternoon':
      return 'Aktiv ettermiddag'
    case 'active':
      return 'Huset er aktivt'
    case 'quiet':
    default:
      return 'Huset er stille'
  }
}

function getNivaSummary(state: HousePresenceState, activeRoomNames: string[], input: HousePresenceInput) {
  const activeRoomsText =
    activeRoomNames.length > 0 ? ` Det er aktivitet i ${activeRoomNames.join(' og ')}.` : ''
  const assistantText = input.robot?.isCleaning
    ? ` Det er aktivitet fra en assistent${input.robot.currentRoom ? ` i ${input.robot.currentRoom}` : ''}.`
    : ''
  const sensorText = input.sensors?.environmentalSummary ? ` ${input.sensors.environmentalSummary}` : ''

  switch (state) {
    case 'away':
      return 'Huset står i Borte-modus og virker stille akkurat nå.'
    case 'empty':
      return 'Huset virker tomt akkurat nå. Det er lite lys, lite aktivitet og stille media.'
    case 'storm':
      return 'Været tar litt plass rundt huset nå, så jeg følger ekstra med.'
    case 'night':
      return 'Huset virker stille nå. Det passer med natt og lav aktivitet.'
    case 'lateActivity':
      return `Det er sen kveld, men huset har fortsatt aktivitet.${activeRoomsText}`
    case 'darkQuiet':
      return 'Det virker stille og mørkt inne nå.'
    case 'rainQuietEvening':
      return 'Det er en dempet regnkveld. Inne virker huset lavmælt og stabilt.'
    case 'cozy':
      return 'Det føles som en lun kveld hjemme.'
    case 'focus':
      return input.media?.isPlaying
        ? 'Huset har en konsentrert stemning akkurat nå, med fokusmusikk i bakgrunnen.'
        : 'Huset virker konsentrert og stabilt akkurat nå.'
    case 'quietEvening':
      return `Det virker som en stille kveld hjemme.${activeRoomsText}`
    case 'evening':
      return `Det føles som en stille kveld hjemme.${activeRoomsText}`
    case 'activeAfternoon':
      return `Det er aktiv ettermiddag i huset.${activeRoomsText}${assistantText}${sensorText}`
    case 'active':
      return `Huset er aktivt akkurat nå.${activeRoomsText}${assistantText}${sensorText}`
    case 'quiet':
    default:
      return input.robot?.isCleaning
        ? `Huset er stille mens rengjøringen pågår.${assistantText}`
        : `Det er lite aktivitet hjemme nå.${sensorText}`
  }
}

export function buildHousePresenceState(input: HousePresenceInput): HousePresence {
  const timeBucket = getTimeBucket(input.now.getHours())
  const lightsOnCount = input.rooms.reduce((count, room) => count + room.lightsOn, 0)
  const averageBrightness = getAverageBrightness(input)
  const activeRoomNames = getActiveRoomNames(input)
  const hasCalendarActivity = input.calendarActivityCount > 0
  const hasMediaActivity = Boolean(input.media?.isPlaying)
  const hasRobotActivity = Boolean(input.robot?.isCleaning)
  const hasSensorActivity = (input.sensors?.activeRoomNames.length ?? 0) > 0
  const activeRoomCount = input.rooms.filter(
    (room) => room.lightsOn > 0 || (room.heatDemand ?? 0) > 25,
  ).length + (hasSensorActivity ? 1 : 0)
  const heatActiveRoomCount = input.rooms.filter((room) => (room.heatDemand ?? 0) > 25).length
  const hasWeatherAlert = Boolean(
    input.weather?.alert || ((input.weather?.windSpeed ?? 0) >= 12 && input.weather?.rainExpected),
  )
  const mediaMood = input.media?.mood
  const isAway = input.globalMode.toLowerCase() === 'borte'
  const isLowLight = lightsOnCount <= 1 || averageBrightness <= 25
  const isDarkAndQuiet = lightsOnCount === 0 && averageBrightness === 0 && !hasMediaActivity
  const hasRain = Boolean(input.weather?.rainExpected)
  const isBusy =
    lightsOnCount >= 4 ||
    activeRoomCount >= 2 ||
    heatActiveRoomCount >= 2 ||
    mediaMood === 'energetic' ||
    hasCalendarActivity ||
    hasRobotActivity ||
    hasSensorActivity

  let state: HousePresenceState = 'quiet'

  if (isAway) {
    state = lightsOnCount === 0 && !hasMediaActivity && activeRoomCount === 0 ? 'empty' : 'away'
  } else if (hasWeatherAlert) {
    state = 'storm'
  } else if (timeBucket === 'night' && isBusy) {
    state = 'lateActivity'
  } else if (timeBucket === 'night' && isLowLight && (!hasMediaActivity || mediaMood === 'sleep')) {
    state = 'night'
  } else if (timeBucket === 'evening' && hasRain && lightsOnCount <= 2 && !isBusy) {
    state = 'rainQuietEvening'
  } else if (
    timeBucket === 'evening' &&
    hasRain &&
    (mediaMood === 'calm' || mediaMood === 'evening') &&
    lightsOnCount > 0
  ) {
    state = 'cozy'
  } else if (isDarkAndQuiet) {
    state = 'darkQuiet'
  } else if (mediaMood === 'focus') {
    state = 'focus'
  } else if (isBusy) {
    state = timeBucket === 'day' ? 'activeAfternoon' : 'active'
  } else if (timeBucket === 'evening') {
    state = 'quietEvening'
  }

  return {
    state,
    label: getPresenceLabel(state),
    nivaSummary: getNivaSummary(state, activeRoomNames, input),
    activeRoomNames,
    signals: {
      timeBucket,
      lightsOnCount,
      averageBrightness,
      hasCalendarActivity,
      hasMediaActivity,
      hasRobotActivity,
      hasSensorActivity,
      hasWeatherAlert,
    },
  }
}
