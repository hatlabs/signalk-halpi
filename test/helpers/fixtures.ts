import type { HalpidValues, HalpidUsbStatus } from '../../src/types.js'

export const sampleValues: HalpidValues = {
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

export const sampleUsb: HalpidUsbStatus = {
  usb0: true,
  usb1: false,
  usb2: true,
  usb3: false
}
