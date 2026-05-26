import { en } from './en'
import { no } from './no'

export type AppLanguage = 'no' | 'en'

export type LynellTranslations = {
  language: {
    label: string
    norwegian: string
    english: string
    helper: string
    saved: string
  }
  nav: Record<
    | 'home'
    | 'rooms'
    | 'lights'
    | 'climate'
    | 'shading'
    | 'camera'
    | 'media'
    | 'assistants'
    | 'calendar'
    | 'manager',
    string
  >
  common: Record<
    | 'saveChanges'
    | 'discardChanges'
    | 'saved'
    | 'unsavedChanges'
    | 'live'
    | 'stale'
    | 'offline'
    | 'connected'
    | 'disconnected'
    | 'enabled'
    | 'disabled',
    string
  >
  niva: Record<'welcome' | 'identity' | 'unknown' | 'saferActionInfo' | 'mqttRetained', string>
  mqtt: Record<
    | 'title'
    | 'broker'
    | 'runtimeMode'
    | 'topicRoot'
    | 'lastMessage'
    | 'topicTrust'
    | 'liveTopics'
    | 'retainedOnly'
    | 'staleTopics'
    | 'noMessages'
    | 'connectedButStale'
    | 'retainedWarning',
    string
  >
}

export const appLanguages: Array<{ value: AppLanguage; label: string }> = [
  { value: 'no', label: 'Norsk' },
  { value: 'en', label: 'English' },
]

export const translations: Record<AppLanguage, LynellTranslations> = {
  no,
  en,
}

export function normalizeAppLanguage(value: unknown): AppLanguage {
  return value === 'en' ? 'en' : 'no'
}

export function getTranslations(language: unknown): LynellTranslations {
  return translations[normalizeAppLanguage(language)]
}
