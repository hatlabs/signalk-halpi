export interface HalpidValues {
  V_in: number
  V_cap: number
  I_in: number
  T_mcu: number
  T_pcb: number
  state: string
  watchdog_enabled: boolean
  watchdog_timeout: number
  daemon_version: string
  hardware_version: string
  firmware_version: string
  device_id: string
}

export interface HalpidUsbStatus {
  usb0: boolean
  usb1: boolean
  usb2: boolean
  usb3: boolean
}

export interface PluginConfig {
  socketPath: string
  pollInterval: number
  pathPrefix: string
}
