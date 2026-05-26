export type LynellAudioCategory =
  | 'feedback'
  | 'information'
  | 'alert'
  | 'critical'
  | 'ambient'
  | 'voice'
  | 'system'

export type LynellAudioInterruptLevel = 'low' | 'medium' | 'high' | 'critical'

export type LynellAudioManifestItem = {
  id: string
  filename: string
  category: LynellAudioCategory
  purpose: string
  defaultEnabled: boolean
  volume: number
  interruptLevel: LynellAudioInterruptLevel
  cooldownMs: number
  description: string
  placeholder: boolean
}

const audioBasePath = '/audio/lynell'

function sound(
  id: string,
  folder: LynellAudioCategory | 'placeholders',
  filename: string,
  category: LynellAudioCategory,
  purpose: string,
  description: string,
  options: Partial<Pick<LynellAudioManifestItem, 'defaultEnabled' | 'volume' | 'interruptLevel' | 'cooldownMs' | 'placeholder'>> = {},
): LynellAudioManifestItem {
  return {
    id,
    filename: `${audioBasePath}/${folder}/${filename}`,
    category,
    purpose,
    description,
    defaultEnabled: options.defaultEnabled ?? true,
    volume: options.volume ?? 0.45,
    interruptLevel: options.interruptLevel ?? 'low',
    cooldownMs: options.cooldownMs ?? 600,
    placeholder: options.placeholder ?? true,
  }
}

export const lynellAudioManifest: LynellAudioManifestItem[] = [
  sound('feedback.tapSoft', 'feedback', 'niva_feedback_tap_soft_v1.wav', 'feedback', 'tap', 'Diskret trykkelyd for knapper.', { volume: 0.22 }),
  sound('feedback.confirmSoft', 'feedback', 'niva_feedback_confirm_soft_v1.wav', 'feedback', 'confirm', 'Myk bekreftelse for trygge handlinger.', { volume: 0.28 }),
  sound('feedback.toggleOn', 'feedback', 'niva_feedback_toggle_on_v1.wav', 'feedback', 'toggle-on', 'Kort toggle-on feedback.', { volume: 0.24 }),
  sound('feedback.toggleOff', 'feedback', 'niva_feedback_toggle_off_v1.wav', 'feedback', 'toggle-off', 'Kort toggle-off feedback.', { volume: 0.22 }),
  sound('feedback.sliderCommit', 'feedback', 'niva_feedback_slider_commit_v1.wav', 'feedback', 'slider-commit', 'Rolig lyd når slider-verdi committes.', { volume: 0.22 }),

  sound('information.observation', 'information', 'niva_info_observation_v1.wav', 'information', 'observation', 'NIVA har en ny observasjon.', { volume: 0.26, cooldownMs: 5000 }),
  sound('information.ready', 'information', 'niva_info_ready_v1.wav', 'information', 'ready', 'Runtime eller flate er klar.', { volume: 0.26 }),
  sound('information.sceneStarted', 'information', 'niva_info_scene_started_v1.wav', 'information', 'scene-started', 'Scene startet.', { volume: 0.3, cooldownMs: 3000 }),
  sound('information.sceneCompleted', 'information', 'niva_info_scene_completed_v1.wav', 'information', 'scene-completed', 'Scene fullført.', { volume: 0.3, cooldownMs: 3000 }),
  sound('information.runtimeRestored', 'information', 'niva_info_runtime_restored_v1.wav', 'information', 'runtime-restored', 'Runtime continuity er restored.', { volume: 0.28, cooldownMs: 10_000 }),

  sound('alert.attentionSoft', 'alert', 'niva_alert_attention_soft_v1.wav', 'alert', 'attention', 'Myk oppmerksomhetslyd.', { volume: 0.34, interruptLevel: 'medium', cooldownMs: 10_000 }),
  sound('alert.staleSignal', 'alert', 'niva_alert_stale_signal_v1.wav', 'alert', 'stale-signal', 'Signal er stale.', { volume: 0.32, interruptLevel: 'medium', cooldownMs: 30_000 }),
  sound('alert.energyAnomaly', 'alert', 'niva_alert_energy_anomaly_v1.wav', 'alert', 'energy-anomaly', 'Energiavvik/indikasjon.', { volume: 0.32, interruptLevel: 'medium', cooldownMs: 30_000 }),
  sound('alert.deviceOffline', 'alert', 'niva_alert_device_offline_v1.wav', 'alert', 'device-offline', 'Provider/device er offline eller stale.', { volume: 0.32, interruptLevel: 'medium', cooldownMs: 30_000 }),
  sound('alert.windowPossibleOpen', 'alert', 'niva_alert_window_possible_open_v1.wav', 'alert', 'possible-open-window', 'Mulig lufting/varmetap.', { volume: 0.32, interruptLevel: 'medium', cooldownMs: 30_000 }),

  sound('critical.alarm', 'critical', 'niva_critical_alarm_v1.wav', 'critical', 'critical-alarm', 'Kritisk alarm placeholder.', { defaultEnabled: false, volume: 0.55, interruptLevel: 'critical', cooldownMs: 60_000 }),
  sound('critical.fireAlert', 'critical', 'niva_critical_fire_alert_v1.wav', 'critical', 'fire-alert', 'Brannalarm placeholder.', { defaultEnabled: false, volume: 0.6, interruptLevel: 'critical', cooldownMs: 60_000 }),
  sound('critical.waterLeak', 'critical', 'niva_critical_water_leak_v1.wav', 'critical', 'water-leak', 'Vannlekkasje placeholder.', { defaultEnabled: false, volume: 0.58, interruptLevel: 'critical', cooldownMs: 60_000 }),
  sound('critical.securityEvent', 'critical', 'niva_critical_security_event_v1.wav', 'critical', 'security-event', 'Sikkerhetshendelse placeholder.', { defaultEnabled: false, volume: 0.58, interruptLevel: 'critical', cooldownMs: 60_000 }),

  sound('ambient.idleBreathe', 'ambient', 'niva_ambient_idle_breathe_v1.wav', 'ambient', 'idle-breathe', 'Ambient idle loop placeholder. Ikke auto-loopet.', { defaultEnabled: false, volume: 0.18, cooldownMs: 60_000 }),
  sound('ambient.nightSoft', 'ambient', 'niva_ambient_night_soft_v1.wav', 'ambient', 'night-soft', 'Myk natt-ambient placeholder. Ikke auto-loopet.', { defaultEnabled: false, volume: 0.16, cooldownMs: 60_000 }),
  sound('ambient.focus', 'ambient', 'niva_ambient_focus_v1.wav', 'ambient', 'focus', 'Fokus-ambient placeholder. Ikke auto-loopet.', { defaultEnabled: false, volume: 0.16, cooldownMs: 60_000 }),

  sound('system.startup', 'system', 'lynell_system_startup_v1.wav', 'system', 'startup', 'Lynell startup placeholder.', { volume: 0.3, cooldownMs: 10_000 }),
  sound('system.shutdown', 'system', 'lynell_system_shutdown_v1.wav', 'system', 'shutdown', 'Lynell shutdown placeholder.', { volume: 0.28, cooldownMs: 10_000 }),
  sound('system.errorSoft', 'system', 'lynell_system_error_soft_v1.wav', 'system', 'soft-error', 'Myk systemfeil placeholder.', { volume: 0.3, interruptLevel: 'medium', cooldownMs: 10_000 }),
  sound('system.networkReconnect', 'system', 'lynell_system_network_reconnect_v1.wav', 'system', 'network-reconnect', 'Nettverk/runtime reconnect placeholder.', { volume: 0.28, cooldownMs: 10_000 }),
]

export const lynellAudioManifestById = new Map(lynellAudioManifest.map((item) => [item.id, item]))

export const lynellAudioCategories: LynellAudioCategory[] = [
  'feedback',
  'information',
  'alert',
  'critical',
  'ambient',
  'voice',
  'system',
]

export function getLynellAudioManifestSummary() {
  const placeholderCount = lynellAudioManifest.filter((item) => item.placeholder).length
  const categoryCounts = lynellAudioManifest.reduce<Record<string, number>>((counts, item) => {
    counts[item.category] = (counts[item.category] ?? 0) + 1
    return counts
  }, {})

  return {
    count: lynellAudioManifest.length,
    placeholderCount,
    categoryCounts,
  }
}
