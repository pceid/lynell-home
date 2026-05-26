import { useEffect, useMemo, useState } from 'react'
import {
  buildRoomSelectOptions,
  type FloorHeatingType,
  type KnxDataType,
  type KnxInterpretationRule,
  type FloorConfig,
  type ShadingType,
  type SystemClimateConfig,
  type SystemRoomConfig,
  type SystemSensorConfig,
  type SystemShadingConfig,
} from '../config/systemConfig'
import type { Room } from '../data/rooms'
import { getRoomConfiguredVolume } from '../runtime/heatDemandAnalysis'
import { isRoomCapabilityVisible, type UiCapabilityConfig } from '../runtime/uiCapabilities'

const knxDataTypeOptions: KnxDataType[] = ['1-bit', '1-byte', '2-byte float']
const knxInterpretationRuleOptions: KnxInterpretationRule[] = ['standard', 'boolFromValueAboveZero']
const shadingTypeOptions: ShadingType[] = [
  'screen',
  'blind',
  'curtain',
  'awning',
  'persienne',
  'markise',
  'gardin',
]
const floorHeatingTypeOptions: Array<{ value: FloorHeatingType; label: string }> = [
  { value: '', label: 'Ikke valgt' },
  { value: 'vannbåren', label: 'Vannbåren' },
  { value: 'elektrisk', label: 'Elektrisk' },
  { value: 'radiator', label: 'Radiator' },
  { value: 'annet', label: 'Annet' },
]

type RoomManagerTab = 'overview' | 'room-data' | 'climate' | 'lighting' | 'sensors' | 'shading'

const roomManagerTabs: Array<{ id: RoomManagerTab; label: string }> = [
  { id: 'overview', label: 'Oversikt' },
  { id: 'room-data', label: 'Romdata' },
  { id: 'climate', label: 'Klima' },
  { id: 'lighting', label: 'Lys' },
  { id: 'sensors', label: 'Sensorer' },
  { id: 'shading', label: 'Solskjerming' },
]

type RoomAdvancedField =
  | 'heatEmitterType'
  | 'heatPowerWatts'
  | 'nominalPowerWatts'
  | 'floorHeatingType'
  | 'floorAreaM2'
  | 'ceilingHeightM'
  | 'manualVolumeM3'
  | 'note'

type ZoneConfigField =
  | 'dimmable'
  | 'light'
  | 'lightDataType'
  | 'lightFeedback'
  | 'lightFeedbackDataType'
  | 'value'
  | 'valueDataType'
  | 'valueFeedback'
  | 'valueFeedbackDataType'
  | 'feedbackInterpretationRule'
  | 'deriveLightStateFromValueFeedback'

type ClimateConfigField =
  | 'climateActive'
  | 'liveClimateActive'
  | 'temperature'
  | 'temperatureDataType'
  | 'setpoint'
  | 'setpointDataType'
  | 'setpointWriteStrategy'
  | 'mode'
  | 'modeDataType'
  | 'setpointFeedback'
  | 'setpointFeedbackDataType'
  | 'modeFeedback'
  | 'modeFeedbackDataType'
  | 'heatDemand'
  | 'heatDemandDataType'

type ShadingConfigField =
  | 'label'
  | 'roomKey'
  | 'type'
  | 'active'
  | 'visible'
  | 'maturity'
  | 'zoneId'
  | 'zoneName'
  | 'up'
  | 'down'
  | 'stop'
  | 'position'
  | 'feedbackPosition'
  | 'upDownDpt'
  | 'stopDpt'
  | 'positionDpt'
  | 'feedbackPositionDpt'
  | 'invertUpDown'
  | 'invertPosition'
  | 'windAlarm'
  | 'sunAuto'
  | 'positionDataType'
  | 'angle'
  | 'angleDataType'

type RoomManagerPanelProps = {
  isConfigDirty: boolean
  rooms: Room[]
  systemConfigRooms: SystemRoomConfig[]
  floorConfigs: FloorConfig[]
  selectedRoomKey: string | null
  shadingConfig: SystemShadingConfig[]
  uiCapabilityConfig: UiCapabilityConfig
  onSelectedRoomChange: (roomKey: string) => void
  onBackToRooms: () => void
  onRoomNameChange: (roomId: number, value: string) => void
  onRoomConfiguredChange: (roomId: number, value: boolean) => void
  onRoomAdvancedChange: (roomId: number, field: RoomAdvancedField, value: string) => void
  onAddZone: (roomId: number) => void
  onDeleteZone: (roomId: number, zoneId: string) => void
  onZoneNameChange: (roomId: number, zoneId: string, value: string) => void
  onZoneConfigChange: (roomKey: string, zoneKey: string, field: ZoneConfigField, value: string | boolean) => void
  onClimateConfigChange: (roomKey: string, field: ClimateConfigField, value: string | boolean) => void
  onSensorConfigChange: (
    roomKey: string,
    sensorKey: keyof SystemSensorConfig,
    field: 'address' | 'dataType',
    value: string,
  ) => void
  onShadingConfigChange: (shadingId: string, field: ShadingConfigField, value: string | boolean) => void
  onSaveConfig: () => void
  onDiscardConfig: () => void
}

function getSensorPoint(sensors: SystemSensorConfig | undefined, sensorKey: keyof SystemSensorConfig) {
  return sensors?.[sensorKey] ?? { address: '', dataType: '1-bit' as KnxDataType }
}

function formatVolume(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)} m³` : 'Ikke beregnet'
}

function countConfiguredSensors(sensors: SystemSensorConfig | undefined) {
  if (!sensors) {
    return 0
  }

  return Object.values(sensors).filter((point) => point.address.trim().length > 0).length
}

function hasShadingAddress(value?: string | null) {
  return String(value ?? '').trim().length > 0
}

function getRoomManagerShadingStatus(item: SystemShadingConfig) {
  const configuredCount = [
    item.up,
    item.down,
    item.stop,
    item.position,
    item.feedbackPosition,
    item.angle,
    item.windAlarm,
    item.sunAuto,
  ].filter(hasShadingAddress).length
  const missingCore: string[] = []

  if (!hasShadingAddress(item.up) && !hasShadingAddress(item.down)) {
    missingCore.push('opp/ned')
  }
  if (!hasShadingAddress(item.stop)) {
    missingCore.push('stopp')
  }
  if (!hasShadingAddress(item.position)) {
    missingCore.push('posisjon')
  }

  return {
    configuredCount,
    missingCore,
    label: !item.active
      ? 'Inaktiv'
      : configuredCount === 0
        ? 'Mangler gruppeadresse'
        : missingCore.length === 0
          ? 'Klar'
          : 'Delvis konfigurert',
  }
}

function DataTypeSelect({
  value,
  onChange,
  label = 'Datatype',
}: {
  value?: KnxDataType
  onChange: (value: KnxDataType) => void
  label?: string
}) {
  return (
    <label className="manager-field">
      <span>{label}</span>
      <select
        className="manager-input room-manager__input"
        value={value ?? '1-bit'}
        onChange={(event) => onChange(event.target.value as KnxDataType)}
      >
        {knxDataTypeOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function ClimateAddressField({
  climate,
  field,
  dataTypeField,
  label,
  roomKey,
  onClimateConfigChange,
}: {
  climate: SystemClimateConfig
  field: 'temperature' | 'setpoint' | 'setpointFeedback' | 'mode' | 'modeFeedback' | 'heatDemand'
  dataTypeField:
    | 'temperatureDataType'
    | 'setpointDataType'
    | 'setpointFeedbackDataType'
    | 'modeDataType'
    | 'modeFeedbackDataType'
    | 'heatDemandDataType'
  label: string
  roomKey: string
  onClimateConfigChange: RoomManagerPanelProps['onClimateConfigChange']
}) {
  return (
    <div className="room-manager__address-row">
      <label className="manager-field">
        <span>{label}</span>
        <input
          className="manager-input room-manager__input"
          type="text"
          value={climate[field]}
          onChange={(event) => onClimateConfigChange(roomKey, field, event.target.value)}
        />
      </label>
      <DataTypeSelect
        value={climate[dataTypeField]}
        onChange={(value) => onClimateConfigChange(roomKey, dataTypeField, value)}
      />
    </div>
  )
}

export function RoomManagerPanel({
  isConfigDirty,
  rooms,
  systemConfigRooms,
  floorConfigs,
  selectedRoomKey,
  shadingConfig,
  uiCapabilityConfig,
  onSelectedRoomChange,
  onBackToRooms,
  onRoomNameChange,
  onRoomConfiguredChange,
  onRoomAdvancedChange,
  onAddZone,
  onDeleteZone,
  onZoneNameChange,
  onZoneConfigChange,
  onClimateConfigChange,
  onSensorConfigChange,
  onShadingConfigChange,
  onSaveConfig,
  onDiscardConfig,
}: RoomManagerPanelProps) {
  const [activeTab, setActiveTab] = useState<RoomManagerTab>('overview')
  const selectedRoom =
    systemConfigRooms.find((room) => room.key === selectedRoomKey) ?? systemConfigRooms[0]
  const runtimeRoom = rooms.find((room) => room.key === selectedRoom?.key)
  const selectedRoomShading = shadingConfig.filter((item) => item.roomKey === selectedRoom?.key)
  const activeShadingCount = selectedRoomShading.filter((item) => item.active).length
  const calculatedVolume = getRoomConfiguredVolume(selectedRoom)
  const configuredSensorCount = countConfiguredSensors(selectedRoom?.sensors)
  const roomOptions = useMemo(
    () => buildRoomSelectOptions(systemConfigRooms, floorConfigs),
    [floorConfigs, systemConfigRooms],
  )
  const visibleRoomManagerTabs = roomManagerTabs.filter((tab) => {
    if (!selectedRoom) {
      return tab.id === 'overview' || tab.id === 'room-data'
    }

    if (tab.id === 'climate') {
      return isRoomCapabilityVisible(uiCapabilityConfig, selectedRoom.key, 'climate')
    }

    if (tab.id === 'lighting') {
      return isRoomCapabilityVisible(uiCapabilityConfig, selectedRoom.key, 'lighting')
    }

    if (tab.id === 'shading') {
      return isRoomCapabilityVisible(uiCapabilityConfig, selectedRoom.key, 'shading')
    }

    return true
  })

  useEffect(() => {
    if (!visibleRoomManagerTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab('overview')
    }
  }, [activeTab, visibleRoomManagerTabs])

  const sensorRows: Array<[keyof SystemSensorConfig, string]> = useMemo(
    () => [
      ['presence', 'Tilstedeværelse'],
      ['motion', 'Bevegelse'],
      ['co2', 'CO2'],
      ['humidity', 'Fukt'],
      ['floorTemperature', 'Gulvtemperatur'],
      ['lux', 'Lux'],
    ],
    [],
  )

  if (!selectedRoom) {
    return (
      <section className="room-section" aria-label="Room Manager">
        <div className="room-section__header">
          <p className="eyebrow">Room Manager</p>
          <h2>Ingen rom konfigurert</h2>
        </div>
      </section>
    )
  }

  return (
    <section className="room-section room-manager" aria-label="Room Manager">
      <article className="manager-card manager-card--wide room-manager__topbar">
        <div className="room-manager__title">
          <p className="eyebrow">Room Manager</p>
          <h2>{selectedRoom.name}</h2>
          <span>Rommets sannhet · teknisk oppsett for valgt rom</span>
        </div>
        <label className="manager-field room-manager__room-picker">
          <span>Rom</span>
          <select
            className="manager-input room-manager__input"
            value={selectedRoom.key}
            onChange={(event) => onSelectedRoomChange(event.target.value)}
          >
            {roomOptions.map((room) => (
              <option key={room.key} value={room.key}>
                {room.label}
              </option>
            ))}
          </select>
        </label>
        <div className="room-manager__actions">
          <span className={`manager-save-state ${isConfigDirty ? 'is-dirty' : 'is-saved'}`}>
            {isConfigDirty ? 'Ulagrede endringer' : 'Lagret'}
          </span>
          <button type="button" className="manager-action" onClick={onBackToRooms}>
            Til Rom
          </button>
          <button type="button" className="manager-action manager-action--primary" onClick={onSaveConfig} disabled={!isConfigDirty}>
            Lagre
          </button>
          <button type="button" className="manager-action" onClick={onDiscardConfig} disabled={!isConfigDirty}>
            Forkast
          </button>
        </div>
      </article>

      <nav className="room-manager__tabs" aria-label="Room Manager-seksjoner">
        {visibleRoomManagerTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`room-manager__tab ${activeTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' ? (
        <article className="manager-card manager-card--wide">
          <p className="room-card__label">Oversikt</p>
          <div className="room-manager__summary-grid">
            <div className="room-manager__metric">
              <span>Aktivt rom</span>
              <strong>{selectedRoom.configured ? 'Ja' : 'Nei'}</strong>
            </div>
            <div className="room-manager__metric">
              <span>Klima</span>
              <strong>{selectedRoom.climate.active ? 'Aktiv' : 'Av'}</strong>
            </div>
            <div className="room-manager__metric">
              <span>Lyssoner</span>
              <strong>{selectedRoom.zones.length}</strong>
            </div>
            <div className="room-manager__metric">
              <span>Sensorer</span>
              <strong>{configuredSensorCount} konfigurert</strong>
            </div>
            <div className="room-manager__metric">
              <span>Solskjerming</span>
              <strong>{activeShadingCount > 0 ? `${activeShadingCount} aktiv` : 'Ingen aktiv'}</strong>
            </div>
            <div className="room-manager__metric">
              <span>Volum / areal</span>
              <strong>
                {formatVolume(calculatedVolume)}
                {typeof selectedRoom.floorAreaM2 === 'number' ? ` · ${selectedRoom.floorAreaM2} m²` : ''}
              </strong>
            </div>
            <div className="room-manager__metric">
              <span>Varmeeffekt</span>
              <strong>
                {typeof selectedRoom.heatPowerWatts === 'number'
                  ? `${selectedRoom.heatPowerWatts} W estimert`
                  : typeof selectedRoom.nominalPowerWatts === 'number'
                    ? `${selectedRoom.nominalPowerWatts} W nominell`
                    : 'Ikke satt'}
              </strong>
            </div>
            <div className="room-manager__metric">
              <span>Runtime</span>
              <strong>
                {runtimeRoom
                  ? `${runtimeRoom.temperature.toFixed(1)} °C · ${runtimeRoom.zones.length} soner`
                  : 'Ingen runtime'}
              </strong>
            </div>
          </div>
        </article>
      ) : null}

      {activeTab === 'room-data' ? (
        <article className="manager-card manager-card--wide">
          <p className="room-card__label">Romdata</p>
          <div className="room-manager__form-grid">
            <label className="manager-field">
              <span>Romnavn</span>
              <input
                className="manager-input room-manager__input"
                type="text"
                value={selectedRoom.name}
                onChange={(event) => onRoomNameChange(selectedRoom.id, event.target.value)}
              />
            </label>
            <label className="manager-toggle room-manager__toggle">
              <input
                type="checkbox"
                checked={selectedRoom.configured}
                onChange={(event) => onRoomConfiguredChange(selectedRoom.id, event.target.checked)}
              />
              Aktivt rom
            </label>
            <label className="manager-field">
              <span>Varmeavgiver</span>
              <select
                className="manager-input room-manager__input"
                value={selectedRoom.heatEmitterType ?? ''}
                onChange={(event) => onRoomAdvancedChange(selectedRoom.id, 'heatEmitterType', event.target.value)}
              >
                <option value="">Ikke valgt</option>
                <option value="gulvvarme">Gulvvarme</option>
                <option value="radiator">Radiator</option>
                <option value="viftekonvektor">Viftekonvektor</option>
                <option value="elektrisk varme">Elektrisk varme</option>
                <option value="annet">Annet</option>
              </select>
            </label>
            <label className="manager-field">
              <span>Estimert varmeeffekt W</span>
              <input
                className="manager-input room-manager__input"
                type="number"
                inputMode="numeric"
                min="0"
                value={selectedRoom.heatPowerWatts ?? ''}
                onChange={(event) => onRoomAdvancedChange(selectedRoom.id, 'heatPowerWatts', event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span>Nominell effekt W</span>
              <input
                className="manager-input room-manager__input"
                type="number"
                inputMode="numeric"
                min="0"
                value={selectedRoom.nominalPowerWatts ?? ''}
                onChange={(event) => onRoomAdvancedChange(selectedRoom.id, 'nominalPowerWatts', event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span>Gulvvarmetype</span>
              <select
                className="manager-input room-manager__input"
                value={selectedRoom.floorHeatingType ?? ''}
                onChange={(event) => onRoomAdvancedChange(selectedRoom.id, 'floorHeatingType', event.target.value)}
              >
                {floorHeatingTypeOptions.map((option) => (
                  <option key={option.value || 'none'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="manager-field">
              <span>Areal m²</span>
              <input
                className="manager-input room-manager__input"
                type="number"
                inputMode="decimal"
                value={selectedRoom.floorAreaM2 ?? ''}
                onChange={(event) => onRoomAdvancedChange(selectedRoom.id, 'floorAreaM2', event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span>Takhøyde m</span>
              <input
                className="manager-input room-manager__input"
                type="number"
                inputMode="decimal"
                value={selectedRoom.ceilingHeightM ?? ''}
                onChange={(event) => onRoomAdvancedChange(selectedRoom.id, 'ceilingHeightM', event.target.value)}
              />
            </label>
            <label className="manager-field">
              <span>Manuelt volum m³</span>
              <input
                className="manager-input room-manager__input"
                type="number"
                inputMode="decimal"
                value={selectedRoom.manualVolumeM3 ?? ''}
                onChange={(event) => onRoomAdvancedChange(selectedRoom.id, 'manualVolumeM3', event.target.value)}
              />
            </label>
            <div className="room-manager__metric">
              <span>Beregnet volum</span>
              <strong>{formatVolume(calculatedVolume)}</strong>
            </div>
            <label className="manager-field room-manager__wide-field">
              <span>Romnotat</span>
              <textarea
                className="manager-input room-manager__input"
                rows={3}
                value={selectedRoom.note ?? ''}
                onChange={(event) => onRoomAdvancedChange(selectedRoom.id, 'note', event.target.value)}
              />
            </label>
          </div>
        </article>
      ) : null}

      {activeTab === 'climate' ? (
        <article className="manager-card manager-card--wide">
          <div className="room-manager__section-header">
            <div>
              <p className="room-card__label">Klima</p>
              <span>Adresser og datatyper for valgt rom</span>
            </div>
            <div className="manager-chip-row">
              <label className="manager-toggle">
                <input
                  type="checkbox"
                  checked={selectedRoom.climate.active}
                  onChange={(event) => onClimateConfigChange(selectedRoom.key, 'climateActive', event.target.checked)}
                />
                Aktiv
              </label>
              <label className="manager-toggle">
                <input
                  type="checkbox"
                  checked={selectedRoom.climate.liveActive}
                  onChange={(event) => onClimateConfigChange(selectedRoom.key, 'liveClimateActive', event.target.checked)}
                />
                Live aktiv
              </label>
            </div>
          </div>
          <div className="room-manager__address-grid">
            <ClimateAddressField climate={selectedRoom.climate} field="temperature" dataTypeField="temperatureDataType" label="Temperatur" roomKey={selectedRoom.key} onClimateConfigChange={onClimateConfigChange} />
            <ClimateAddressField climate={selectedRoom.climate} field="setpoint" dataTypeField="setpointDataType" label="Settpunkt" roomKey={selectedRoom.key} onClimateConfigChange={onClimateConfigChange} />
            <label className="manager-field">
              <span>Settpunktstrategi</span>
              <select
                className="manager-input room-manager__input"
                value={selectedRoom.climate.setpointWriteStrategy ?? 'absoluteTemperature'}
                onChange={(event) =>
                  onClimateConfigChange(
                    selectedRoom.key,
                    'setpointWriteStrategy',
                    event.target.value,
                  )
                }
              >
                <option value="absoluteTemperature">Send absolute temperature</option>
                <option value="relativeOffset">Send offset (foundation/disabled)</option>
              </select>
            </label>
            <ClimateAddressField climate={selectedRoom.climate} field="setpointFeedback" dataTypeField="setpointFeedbackDataType" label="Settpunkt feedback" roomKey={selectedRoom.key} onClimateConfigChange={onClimateConfigChange} />
            <ClimateAddressField climate={selectedRoom.climate} field="heatDemand" dataTypeField="heatDemandDataType" label="HeatDemand" roomKey={selectedRoom.key} onClimateConfigChange={onClimateConfigChange} />
            <ClimateAddressField climate={selectedRoom.climate} field="mode" dataTypeField="modeDataType" label="Mode" roomKey={selectedRoom.key} onClimateConfigChange={onClimateConfigChange} />
            <ClimateAddressField climate={selectedRoom.climate} field="modeFeedback" dataTypeField="modeFeedbackDataType" label="Mode feedback" roomKey={selectedRoom.key} onClimateConfigChange={onClimateConfigChange} />
          </div>
        </article>
      ) : null}

      {activeTab === 'lighting' ? (
        <article className="manager-card manager-card--wide">
          <div className="room-manager__section-header">
            <div>
              <p className="room-card__label">Lys</p>
              <span>{selectedRoom.zones.length} lyssoner i valgt rom</span>
            </div>
            <button type="button" className="manager-action" onClick={() => onAddZone(selectedRoom.id)}>
              Legg til sone
            </button>
          </div>
          <div className="room-manager__accordion-stack">
            {selectedRoom.zones.length === 0 ? (
              <p className="manager-zone-card manager-zone-card--empty">Ingen lyssoner i rommet.</p>
            ) : (
              selectedRoom.zones.map((zone, index) => (
                <details key={zone.id} className="room-manager__zone-accordion" open={index === 0}>
                  <summary>
                    <span>
                      <strong>{zone.name}</strong>
                      <small>
                        {zone.dimmable ? 'Dimmbar' : 'Av/på'} · {zone.light || zone.value ? 'write satt' : 'mangler write'}
                      </small>
                    </span>
                    <em>Detaljer</em>
                  </summary>
                  <div className="room-manager__form-grid">
                    <label className="manager-field">
                      <span>Sonenavn</span>
                      <input className="manager-input room-manager__input" type="text" value={zone.name} onChange={(event) => onZoneNameChange(selectedRoom.id, zone.id, event.target.value)} />
                    </label>
                    <label className="manager-toggle room-manager__toggle">
                      <input type="checkbox" checked={zone.dimmable} onChange={(event) => onZoneConfigChange(selectedRoom.key, zone.key, 'dimmable', event.target.checked)} />
                      Dimmbar
                    </label>
                    {([
                      ['light', 'Light write'],
                      ['lightFeedback', 'Light feedback'],
                      ['value', 'Value write'],
                      ['valueFeedback', 'Value feedback'],
                    ] as const).map(([field, label]) => (
                      <label key={field} className="manager-field">
                        <span>{label}</span>
                        <input className="manager-input room-manager__input" type="text" value={zone[field]} onChange={(event) => onZoneConfigChange(selectedRoom.key, zone.key, field, event.target.value)} />
                      </label>
                    ))}
                    {([
                      ['lightDataType', 'Light datatype'],
                      ['lightFeedbackDataType', 'Light feedback datatype'],
                      ['valueDataType', 'Value datatype'],
                      ['valueFeedbackDataType', 'Value feedback datatype'],
                    ] as const).map(([field, label]) => (
                      <DataTypeSelect key={field} label={label} value={zone[field]} onChange={(value) => onZoneConfigChange(selectedRoom.key, zone.key, field, value)} />
                    ))}
                    <label className="manager-field">
                      <span>Tolkningsregel</span>
                      <select
                        className="manager-input room-manager__input"
                        value={zone.feedbackInterpretationRule ?? 'standard'}
                        onChange={(event) => onZoneConfigChange(selectedRoom.key, zone.key, 'feedbackInterpretationRule', event.target.value as KnxInterpretationRule)}
                      >
                        {knxInterpretationRuleOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="manager-toggle room-manager__wide-field">
                      <input
                        type="checkbox"
                        checked={Boolean(zone.deriveLightStateFromValueFeedback)}
                        onChange={(event) => onZoneConfigChange(selectedRoom.key, zone.key, 'deriveLightStateFromValueFeedback', event.target.checked)}
                      />
                      Utled lysstatus fra value feedback
                    </label>
                    <button type="button" className="manager-action manager-action--danger" onClick={() => onDeleteZone(selectedRoom.id, zone.id)}>
                      Slett sone
                    </button>
                  </div>
                </details>
              ))
            )}
          </div>
        </article>
      ) : null}

      {activeTab === 'sensors' ? (
        <article className="manager-card manager-card--wide">
          <p className="room-card__label">Sensorer</p>
          <div className="room-manager__address-grid">
            {sensorRows.map(([sensorKey, label]) => {
              const point = getSensorPoint(selectedRoom.sensors, sensorKey)
              return (
                <div key={sensorKey} className="room-manager__address-row">
                  <label className="manager-field">
                    <span>{label}</span>
                    <input className="manager-input room-manager__input" type="text" value={point.address} onChange={(event) => onSensorConfigChange(selectedRoom.key, sensorKey, 'address', event.target.value)} />
                  </label>
                  <DataTypeSelect value={point.dataType} onChange={(value) => onSensorConfigChange(selectedRoom.key, sensorKey, 'dataType', value)} />
                </div>
              )
            })}
          </div>
        </article>
      ) : null}

      {activeTab === 'shading' ? (
        <article className="manager-card manager-card--wide">
          <p className="room-card__label">Solskjerming</p>
          <div className="room-manager__accordion-stack">
            {selectedRoomShading.length === 0 ? (
              <p className="manager-zone-card manager-zone-card--empty">Ingen solskjerming er mappet til dette rommet.</p>
            ) : (
              selectedRoomShading.map((item, index) => {
                const shadingStatus = getRoomManagerShadingStatus(item)

                return (
                <details key={item.id} className="room-manager__zone-accordion" open={index === 0}>
                  <summary>
                    <span>
                      <strong>{item.label}</strong>
                      <small>
                        {shadingStatus.label} · {item.type}
                        {shadingStatus.missingCore.length > 0 ? ` · mangler ${shadingStatus.missingCore.join(', ')}` : ''}
                      </small>
                    </span>
                    <em>Detaljer</em>
                  </summary>
                  <div className="room-manager__form-grid">
                    <label className="manager-field">
                      <span>Navn</span>
                      <input className="manager-input room-manager__input" type="text" value={item.label} onChange={(event) => onShadingConfigChange(item.id, 'label', event.target.value)} />
                    </label>
                    <label className="manager-field">
                      <span>Type</span>
                      <select className="manager-input room-manager__input" value={item.type} onChange={(event) => onShadingConfigChange(item.id, 'type', event.target.value as ShadingType)}>
                        {shadingTypeOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="manager-toggle room-manager__toggle">
                      <input type="checkbox" checked={item.active} onChange={(event) => onShadingConfigChange(item.id, 'active', event.target.checked)} />
                      Aktiv
                    </label>
                    <label className="manager-toggle room-manager__toggle">
                      <input type="checkbox" checked={item.visible ?? true} onChange={(event) => onShadingConfigChange(item.id, 'visible', event.target.checked)} />
                      Synlig når aktiv
                    </label>
                    <label className="manager-field">
                      <span>Maturity</span>
                      <select className="manager-input room-manager__input" value={item.maturity ?? 'foundation'} onChange={(event) => onShadingConfigChange(item.id, 'maturity', event.target.value)}>
                        <option value="foundation">foundation</option>
                        <option value="prepared">prepared</option>
                        <option value="live">live</option>
                        <option value="future">future</option>
                      </select>
                    </label>
                    <label className="manager-field">
                      <span>Sone-ID</span>
                      <input className="manager-input room-manager__input" type="text" value={item.zoneId ?? ''} onChange={(event) => onShadingConfigChange(item.id, 'zoneId', event.target.value)} />
                    </label>
                    <label className="manager-field">
                      <span>Sonenavn</span>
                      <input className="manager-input room-manager__input" type="text" value={item.zoneName ?? ''} onChange={(event) => onShadingConfigChange(item.id, 'zoneName', event.target.value)} />
                    </label>
                    {([
                      ['up', 'Opp'],
                      ['down', 'Ned'],
                      ['stop', 'Stopp'],
                      ['position', 'Posisjon'],
                      ['feedbackPosition', 'Feedback posisjon'],
                      ['angle', 'Vinkel'],
                      ['windAlarm', 'Vindalarm'],
                      ['sunAuto', 'Solauto'],
                    ] as const).map(([field, label]) => (
                      <label key={field} className="manager-field">
                        <span>{label}</span>
                        <input className="manager-input room-manager__input" type="text" value={String(item[field] ?? '')} onChange={(event) => onShadingConfigChange(item.id, field, event.target.value)} />
                      </label>
                    ))}
                    {([
                      ['upDownDpt', 'Opp/ned DPT', '1.008'],
                      ['stopDpt', 'Stopp DPT', '1.007'],
                      ['positionDpt', 'Posisjon DPT', '5.001'],
                      ['feedbackPositionDpt', 'Feedback DPT', '5.001'],
                    ] as const).map(([field, label, fallback]) => (
                      <label key={field} className="manager-field">
                        <span>{label}</span>
                        <input
                          className="manager-input room-manager__input"
                          type="text"
                          value={String(item[field] ?? fallback)}
                          onChange={(event) => onShadingConfigChange(item.id, field, event.target.value)}
                        />
                      </label>
                    ))}
                    <label className="manager-toggle room-manager__toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(item.invertUpDown)}
                        onChange={(event) => onShadingConfigChange(item.id, 'invertUpDown', event.target.checked)}
                      />
                      Invert direction
                    </label>
                    <label className="manager-toggle room-manager__toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(item.invertPosition)}
                        onChange={(event) => onShadingConfigChange(item.id, 'invertPosition', event.target.checked)}
                      />
                      Invert position
                    </label>
                    <DataTypeSelect label="Posisjon datatype" value={item.positionDataType} onChange={(value) => onShadingConfigChange(item.id, 'positionDataType', value)} />
                    <DataTypeSelect label="Vinkel datatype" value={item.angleDataType} onChange={(value) => onShadingConfigChange(item.id, 'angleDataType', value)} />
                  </div>
                </details>
              )})
            )}
          </div>
        </article>
      ) : null}
    </section>
  )
}
