import type {
  Delta,
  Context,
  Path,
  Timestamp,
  PathValue,
  SourceRef,
  Meta
} from '@signalk/server-api'
import type { HalpidValues, HalpidUsbStatus } from './types.js'

const PATH_META: { path: string; units: string; displayName: string; description: string }[] = [
  {
    path: 'dcInputVoltage',
    units: 'V',
    displayName: 'DC Input Voltage',
    description: 'HALPI2 DC input voltage'
  },
  {
    path: 'supercapVoltage',
    units: 'V',
    displayName: 'Supercap Voltage',
    description: 'HALPI2 supercapacitor voltage'
  },
  {
    path: 'inputCurrent',
    units: 'A',
    displayName: 'Input Current',
    description: 'HALPI2 input current'
  },
  {
    path: 'mcuTemperature',
    units: 'K',
    displayName: 'MCU Temperature',
    description: 'HALPI2 MCU temperature'
  },
  {
    path: 'pcbTemperature',
    units: 'K',
    displayName: 'PCB Temperature',
    description: 'HALPI2 PCB temperature'
  },
  {
    path: 'watchdog.timeout',
    units: 's',
    displayName: 'Watchdog Timeout',
    description: 'HALPI2 watchdog timeout'
  }
]

export function buildDynamicDelta(
  values: HalpidValues,
  usb: HalpidUsbStatus,
  pathPrefix: string
): Delta {
  const pathValues: PathValue[] = [
    { path: `${pathPrefix}.dcInputVoltage` as Path, value: values.V_in },
    { path: `${pathPrefix}.supercapVoltage` as Path, value: values.V_cap },
    { path: `${pathPrefix}.inputCurrent` as Path, value: values.I_in },
    { path: `${pathPrefix}.mcuTemperature` as Path, value: values.T_mcu },
    { path: `${pathPrefix}.pcbTemperature` as Path, value: values.T_pcb },
    { path: `${pathPrefix}.powerState` as Path, value: values.state },
    { path: `${pathPrefix}.watchdog.enabled` as Path, value: values.watchdog_enabled },
    { path: `${pathPrefix}.watchdog.timeout` as Path, value: values.watchdog_timeout },
    { path: `${pathPrefix}.usb.port0` as Path, value: usb.usb0 },
    { path: `${pathPrefix}.usb.port1` as Path, value: usb.usb1 },
    { path: `${pathPrefix}.usb.port2` as Path, value: usb.usb2 },
    { path: `${pathPrefix}.usb.port3` as Path, value: usb.usb3 }
  ]

  return {
    context: 'vessels.self' as Context,
    updates: [
      {
        $source: 'halpi' as SourceRef,
        timestamp: new Date().toISOString() as Timestamp,
        values: pathValues
      }
    ]
  }
}

export function buildStaticDelta(values: HalpidValues, pathPrefix: string): Delta {
  const pathValues: PathValue[] = [
    { path: `${pathPrefix}.daemonVersion` as Path, value: values.daemon_version },
    { path: `${pathPrefix}.hardwareVersion` as Path, value: values.hardware_version },
    { path: `${pathPrefix}.firmwareVersion` as Path, value: values.firmware_version },
    { path: `${pathPrefix}.deviceId` as Path, value: values.device_id }
  ]

  const meta: Meta[] = PATH_META.map((m) => ({
    path: `${pathPrefix}.${m.path}` as Path,
    value: { units: m.units, displayName: m.displayName, description: m.description }
  }))

  const timestamp = new Date().toISOString() as Timestamp

  return {
    context: 'vessels.self' as Context,
    updates: [
      {
        $source: 'halpi' as SourceRef,
        timestamp,
        values: pathValues
      },
      {
        $source: 'halpi' as SourceRef,
        timestamp,
        meta
      }
    ]
  }
}
