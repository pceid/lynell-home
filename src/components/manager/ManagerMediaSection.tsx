import type {
  MediaConfig,
  MediaGroupConfig,
  MediaGroupConfidence,
  MediaGroupSpeakerConfig,
  MediaGroupState,
} from '../../config/systemConfig'
import { getMediaGroupStatus, summarizeMediaGroups } from '../../runtime/cameraMediaFoundation'

type ManagerMediaSectionProps = {
  mediaConfig: MediaConfig
  onMediaConfigChange: <K extends keyof MediaConfig>(field: K, value: MediaConfig[K]) => void
  onAddMediaGroupConfig: () => void
  onMediaGroupConfigChange: (
    mediaGroupId: string,
    field: keyof MediaGroupConfig,
    value: string | boolean,
  ) => void
  onAddMediaGroupSpeaker: (mediaGroupId: string) => void
  onMediaGroupSpeakerChange: (
    mediaGroupId: string,
    speakerId: string,
    field: keyof MediaGroupSpeakerConfig,
    value: string | number | null,
  ) => void
  onDeleteMediaGroupSpeaker: (mediaGroupId: string, speakerId: string) => void
}

const mediaGroupStateOptions: MediaGroupState[] = ['unknown', 'online', 'stale', 'offline']
const mediaGroupConfidenceOptions: MediaGroupConfidence[] = ['low', 'medium', 'high']

function listToText(value?: string[]) {
  return (value ?? []).join(', ')
}

export function ManagerMediaSection({
  mediaConfig,
  onMediaConfigChange,
  onAddMediaGroupConfig,
  onMediaGroupConfigChange,
  onAddMediaGroupSpeaker,
  onMediaGroupSpeakerChange,
  onDeleteMediaGroupSpeaker,
}: ManagerMediaSectionProps) {
  const groupSummary = summarizeMediaGroups(mediaConfig)

  return (
    <article className="manager-card manager-card--wide">
      <div className="manager-block__header">
        <div>
          <p className="room-card__label">Media</p>
          <h2>Media og grupper</h2>
          <p className="manager-helper">
            {mediaConfig.active ? 'Aktiv kilde forberedt i systemet' : 'Skjult i kundevisning til den aktiveres'} · {groupSummary.groupCount} grupper · {groupSummary.delayOffsetCount} offsets
          </p>
        </div>
        <button type="button" className="manager-action" onClick={onAddMediaGroupConfig}>
          Legg til media group
        </button>
      </div>
      <div className="manager-list">
        <div className="manager-row">
          <span>Media aktiv</span>
          <label className="manager-toggle">
            <input
              type="checkbox"
              checked={mediaConfig.active}
              onChange={(event) => onMediaConfigChange('active', event.target.checked)}
            />
            <span>{mediaConfig.active ? 'På' : 'Av'}</span>
          </label>
        </div>
        {mediaConfig.active ? (
          <>
            <div className="manager-row">
              <span>Kilde / type</span>
              <select
                className="manager-input"
                value={mediaConfig.source}
                onChange={(event) =>
                  onMediaConfigChange('source', event.target.value as MediaConfig['source'])
                }
              >
                <option value="Spotify">Spotify</option>
                <option value="Nettradio">Nettradio</option>
                <option value="Annen">Annen</option>
              </select>
            </div>
            <div className="manager-row">
              <span>Link / enhet</span>
              <input
                className="manager-input"
                type="text"
                value={mediaConfig.link}
                placeholder="device id / url / placeholder"
                onChange={(event) => onMediaConfigChange('link', event.target.value)}
              />
            </div>
            <div className="manager-row">
              <span>Rom / område</span>
              <input
                className="manager-input"
                type="text"
                value={mediaConfig.area}
                placeholder="Stue"
                onChange={(event) => onMediaConfigChange('area', event.target.value)}
              />
            </div>
          </>
        ) : (
          <p className="manager-zone-card--empty">Media er ikke aktivert.</p>
        )}
        <div className="manager-block">
          <div className="manager-block__header">
            <strong>Media groups foundation</strong>
            <span>Config only · ingen full audio sync-engine</span>
          </div>
          {mediaConfig.groups.length === 0 ? (
            <p className="manager-zone-card--empty">Ingen media groups ennå.</p>
          ) : (
            <div className="manager-stack">
              {mediaConfig.groups.map((group) => (
                <div key={group.mediaGroupId} className="manager-zone-card">
                  <div className="manager-block__header">
                    <div>
                      <strong>{group.displayName || 'Media group'}</strong>
                      <p className="manager-helper">
                        {getMediaGroupStatus(group)} · {group.speakers.length} speakers · {group.castTargets.length} cast targets
                      </p>
                    </div>
                    <button type="button" className="manager-action" onClick={() => onAddMediaGroupSpeaker(group.mediaGroupId)}>
                      Legg til høyttaler
                    </button>
                  </div>
                  <div className="manager-zone-grid">
                    <label className="manager-field">
                      <span>Navn</span>
                      <input className="manager-input" type="text" value={group.displayName} onChange={(event) => onMediaGroupConfigChange(group.mediaGroupId, 'displayName', event.target.value)} />
                    </label>
                    <label className="manager-field manager-field--toggle">
                      <span>Enabled</span>
                      <input type="checkbox" checked={group.enabled} onChange={(event) => onMediaGroupConfigChange(group.mediaGroupId, 'enabled', event.target.checked)} />
                    </label>
                    <label className="manager-field">
                      <span>State</span>
                      <select className="manager-input" value={group.state} onChange={(event) => onMediaGroupConfigChange(group.mediaGroupId, 'state', event.target.value)}>
                        {mediaGroupStateOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="manager-field">
                      <span>Confidence</span>
                      <select className="manager-input" value={group.groupConfidence} onChange={(event) => onMediaGroupConfigChange(group.mediaGroupId, 'groupConfidence', event.target.value)}>
                        {mediaGroupConfidenceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="manager-field">
                      <span>Cast targets</span>
                      <input className="manager-input" type="text" value={listToText(group.castTargets)} placeholder="device-id, group-id" onChange={(event) => onMediaGroupConfigChange(group.mediaGroupId, 'castTargets', event.target.value)} />
                    </label>
                  </div>
                  {group.speakers.length === 0 ? (
                    <p className="manager-helper">Legg til høyttalere for delay-offset foundation.</p>
                  ) : (
                    <div className="manager-stack">
                      {group.speakers.map((speaker) => (
                        <div key={speaker.id} className="manager-zone-card manager-zone-card--nested">
                          <div className="manager-zone-grid">
                            <label className="manager-field">
                              <span>Høyttaler</span>
                              <input className="manager-input" type="text" value={speaker.displayName} onChange={(event) => onMediaGroupSpeakerChange(group.mediaGroupId, speaker.id, 'displayName', event.target.value)} />
                            </label>
                            <label className="manager-field">
                              <span>Device ID</span>
                              <input className="manager-input" type="text" value={speaker.deviceId} onChange={(event) => onMediaGroupSpeakerChange(group.mediaGroupId, speaker.id, 'deviceId', event.target.value)} />
                            </label>
                            <label className="manager-field">
                              <span>Room key</span>
                              <input className="manager-input" type="text" value={speaker.roomKey} onChange={(event) => onMediaGroupSpeakerChange(group.mediaGroupId, speaker.id, 'roomKey', event.target.value)} />
                            </label>
                            <label className="manager-field">
                              <span>Offset ms</span>
                              <input className="manager-input" type="number" step="1" value={speaker.offsetMs} onChange={(event) => onMediaGroupSpeakerChange(group.mediaGroupId, speaker.id, 'offsetMs', Number(event.target.value))} />
                            </label>
                            <label className="manager-field">
                              <span>Calibration</span>
                              <select className="manager-input" value={speaker.calibrationStatus} onChange={(event) => onMediaGroupSpeakerChange(group.mediaGroupId, speaker.id, 'calibrationStatus', event.target.value)}>
                                <option value="notCalibrated">notCalibrated</option>
                                <option value="manual">manual</option>
                                <option value="estimated">estimated</option>
                                <option value="verified">verified</option>
                              </select>
                            </label>
                            <button type="button" className="manager-action manager-action--danger" onClick={() => onDeleteMediaGroupSpeaker(group.mediaGroupId, speaker.id)}>
                              Fjern
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="manager-helper">
                    Preview/calibration er foundation. Playback engine bruker ikke live sync eller delay offsets ennå.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
