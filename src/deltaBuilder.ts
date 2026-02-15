import type { Delta, Context, Path, Timestamp, PathValue, SourceRef } from '@signalk/server-api'
import type { HalpidValues, HalpidUsbStatus } from './types.js'

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
