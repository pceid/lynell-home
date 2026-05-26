import {
  lynellAudioManifestById,
  type LynellAudioCategory,
  type LynellAudioManifestItem,
} from './audioManifest'

export type LynellAudioSettings = {
  enabled: boolean
  masterVolume: number
  categories: Record<LynellAudioCategory, boolean>
}

export type LynellAudioPlaybackStatus = {
  ok: boolean
  skipped: boolean
  reason: string | null
  soundId: string
  category?: LynellAudioCategory
  playedAt: string
  placeholder?: boolean
}

export type LynellAudioPlayerDiagnostics = {
  enabled: boolean
  lastSoundPlayed: LynellAudioPlaybackStatus | null
  cooldowns: Record<string, number>
  missingFiles: string[]
}

function clampVolume(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(1, value))
}

export class LynellAudioPlayer {
  private cooldownUntil = new Map<string, number>()
  private missingFiles = new Set<string>()
  private lastSoundPlayed: LynellAudioPlaybackStatus | null = null

  getDiagnostics(settings: LynellAudioSettings): LynellAudioPlayerDiagnostics {
    return {
      enabled: settings.enabled,
      lastSoundPlayed: this.lastSoundPlayed,
      cooldowns: Object.fromEntries(this.cooldownUntil.entries()),
      missingFiles: Array.from(this.missingFiles),
    }
  }

  async playSound(
    soundId: string,
    settings: LynellAudioSettings,
    options: { force?: boolean } = {},
  ): Promise<LynellAudioPlaybackStatus> {
    const now = Date.now()
    const playedAt = new Date(now).toISOString()
    const sound = lynellAudioManifestById.get(soundId)

    if (!sound) {
      return this.record({
        ok: false,
        skipped: true,
        reason: 'unknown-sound',
        soundId,
        playedAt,
      })
    }

    if (!options.force && !settings.enabled) {
      return this.record(this.createSkipped(sound, playedAt, 'audio-disabled'))
    }

    if (!options.force && !settings.categories[sound.category]) {
      return this.record(this.createSkipped(sound, playedAt, 'category-disabled'))
    }

    const cooldownUntil = this.cooldownUntil.get(sound.id) ?? 0
    if (!options.force && cooldownUntil > now) {
      return this.record(this.createSkipped(sound, playedAt, 'cooldown'))
    }

    if (typeof window === 'undefined' || typeof window.Audio === 'undefined') {
      return this.record(this.createSkipped(sound, playedAt, 'audio-api-unavailable'))
    }

    try {
      const audio = new Audio(sound.filename)
      audio.volume = clampVolume(settings.masterVolume) * clampVolume(sound.volume)
      await audio.play()
      this.cooldownUntil.set(sound.id, now + sound.cooldownMs)
      return this.record({
        ok: true,
        skipped: false,
        reason: null,
        soundId: sound.id,
        category: sound.category,
        playedAt,
        placeholder: sound.placeholder,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'playback-failed'
      if (message.toLowerCase().includes('not supported') || message.toLowerCase().includes('404')) {
        this.missingFiles.add(sound.filename)
      }

      return this.record({
        ok: false,
        skipped: true,
        reason: message,
        soundId: sound.id,
        category: sound.category,
        playedAt,
        placeholder: sound.placeholder,
      })
    }
  }

  private createSkipped(
    sound: LynellAudioManifestItem,
    playedAt: string,
    reason: string,
  ): LynellAudioPlaybackStatus {
    return {
      ok: true,
      skipped: true,
      reason,
      soundId: sound.id,
      category: sound.category,
      playedAt,
      placeholder: sound.placeholder,
    }
  }

  private record(status: LynellAudioPlaybackStatus) {
    this.lastSoundPlayed = status
    return status
  }
}

export function createLynellAudioPlayer() {
  return new LynellAudioPlayer()
}
