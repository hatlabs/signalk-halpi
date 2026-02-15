import { describe, it, expect } from 'vitest'
import type { PathValue } from '@signalk/server-api'
import { buildDynamicDelta, buildStaticDelta } from '../src/deltaBuilder.js'
import type { HalpidValues, HalpidUsbStatus } from '../src/types.js'

const sampleValues: HalpidValues = {
  V_in: 12.4,
  V_cap: 4.8,
  I_in: 1.2,
  T_mcu: 315.5,
  T_pcb: 310.2,
  state: 'powered',
  watchdog_enabled: true,
  watchdog_timeout: 30,
  daemon_version: '1.0.0',
  hardware_version: '2.0',
  firmware_version: '1.2.3',
  device_id: 'halpi-001'
}

const sampleUsb: HalpidUsbStatus = {
  usb0: true,
  usb1: false,
  usb2: true,
  usb3: false
}

describe('buildDynamicDelta', () => {
  it('produces a delta with 12 path-value pairs', () => {
    const delta = buildDynamicDelta(sampleValues, sampleUsb, 'electrical.halpi')
    const values = delta.updates[0].values as PathValue[]
    expect(values).toHaveLength(12)
  })

  it('maps measurement values correctly', () => {
    const delta = buildDynamicDelta(sampleValues, sampleUsb, 'electrical.halpi')
    const values = delta.updates[0].values as PathValue[]
    const byPath = new Map(values.map((v) => [String(v.path), v.value]))

    expect(byPath.get('electrical.halpi.dcInputVoltage')).toBe(12.4)
    expect(byPath.get('electrical.halpi.supercapVoltage')).toBe(4.8)
    expect(byPath.get('electrical.halpi.inputCurrent')).toBe(1.2)
    expect(byPath.get('electrical.halpi.mcuTemperature')).toBe(315.5)
    expect(byPath.get('electrical.halpi.pcbTemperature')).toBe(310.2)
    expect(byPath.get('electrical.halpi.powerState')).toBe('powered')
  })

  it('maps watchdog values correctly', () => {
    const delta = buildDynamicDelta(sampleValues, sampleUsb, 'electrical.halpi')
    const values = delta.updates[0].values as PathValue[]
    const byPath = new Map(values.map((v) => [String(v.path), v.value]))

    expect(byPath.get('electrical.halpi.watchdog.enabled')).toBe(true)
    expect(byPath.get('electrical.halpi.watchdog.timeout')).toBe(30)
  })

  it('maps USB port values correctly', () => {
    const delta = buildDynamicDelta(sampleValues, sampleUsb, 'electrical.halpi')
    const values = delta.updates[0].values as PathValue[]
    const byPath = new Map(values.map((v) => [String(v.path), v.value]))

    expect(byPath.get('electrical.halpi.usb.port0')).toBe(true)
    expect(byPath.get('electrical.halpi.usb.port1')).toBe(false)
    expect(byPath.get('electrical.halpi.usb.port2')).toBe(true)
    expect(byPath.get('electrical.halpi.usb.port3')).toBe(false)
  })

  it('uses custom path prefix', () => {
    const delta = buildDynamicDelta(sampleValues, sampleUsb, 'custom.prefix')
    const values = delta.updates[0].values as PathValue[]
    const paths = values.map((v) => String(v.path))

    expect(paths.every((p) => p.startsWith('custom.prefix.'))).toBe(true)
  })

  it('sets context to vessels.self', () => {
    const delta = buildDynamicDelta(sampleValues, sampleUsb, 'electrical.halpi')
    expect(String(delta.context)).toBe('vessels.self')
  })

  it('sets $source to halpi', () => {
    const delta = buildDynamicDelta(sampleValues, sampleUsb, 'electrical.halpi')
    expect(String(delta.updates[0].$source)).toBe('halpi')
  })
})

describe('buildStaticDelta', () => {
  it('produces a delta with 4 path-value pairs', () => {
    const delta = buildStaticDelta(sampleValues, 'electrical.halpi')
    const values = delta.updates[0].values as PathValue[]
    expect(values).toHaveLength(4)
  })

  it('maps version and device info correctly', () => {
    const delta = buildStaticDelta(sampleValues, 'electrical.halpi')
    const values = delta.updates[0].values as PathValue[]
    const byPath = new Map(values.map((v) => [String(v.path), v.value]))

    expect(byPath.get('electrical.halpi.daemonVersion')).toBe('1.0.0')
    expect(byPath.get('electrical.halpi.hardwareVersion')).toBe('2.0')
    expect(byPath.get('electrical.halpi.firmwareVersion')).toBe('1.2.3')
    expect(byPath.get('electrical.halpi.deviceId')).toBe('halpi-001')
  })

  it('uses custom path prefix', () => {
    const delta = buildStaticDelta(sampleValues, 'custom.prefix')
    const values = delta.updates[0].values as PathValue[]
    const paths = values.map((v) => String(v.path))

    expect(paths.every((p) => p.startsWith('custom.prefix.'))).toBe(true)
  })

  it('sets context to vessels.self', () => {
    const delta = buildStaticDelta(sampleValues, 'electrical.halpi')
    expect(String(delta.context)).toBe('vessels.self')
  })
})
