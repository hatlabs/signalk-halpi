import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { unlinkSync } from 'node:fs'
import type { ServerAPI, PathValue } from '@signalk/server-api'
import { MockServerAPI } from './helpers/MockServerAPI.js'
import createPlugin from '../src/index.js'
import type { HalpidValues, HalpidUsbStatus } from '../src/types.js'

const socketPath = join(tmpdir(), `halpid-plugin-test-${String(process.pid)}.sock`)

const noop = () => undefined

const mockValues: HalpidValues = {
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

const mockUsb: HalpidUsbStatus = {
  usb0: true,
  usb1: false,
  usb2: true,
  usb3: false
}

let server: http.Server
let mockApp: MockServerAPI

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

beforeAll(async () => {
  try {
    unlinkSync(socketPath)
  } catch {
    // Ignore
  }

  server = http.createServer((req, res) => {
    if (req.url === '/values') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(mockValues))
    } else if (req.url === '/usb') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(mockUsb))
    } else {
      res.writeHead(404)
      res.end()
    }
  })

  await new Promise<void>((resolve) => {
    server.listen(socketPath, resolve)
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err)
      else resolve()
    })
  })
  try {
    unlinkSync(socketPath)
  } catch {
    // Ignore
  }
})

beforeEach(() => {
  mockApp = new MockServerAPI()
})

describe('plugin metadata', () => {
  it('has correct id and name', () => {
    const plugin = createPlugin(mockApp as unknown as ServerAPI)
    expect(plugin.id).toBe('signalk-halpi')
    expect(plugin.name).toBe('HALPI2 Device Monitor')
  })

  it('has a config schema', () => {
    const plugin = createPlugin(mockApp as unknown as ServerAPI)
    expect(plugin.schema).toBeDefined()
  })
})

describe('plugin lifecycle', () => {
  let plugin: ReturnType<typeof createPlugin>

  beforeEach(() => {
    plugin = createPlugin(mockApp as unknown as ServerAPI)
  })

  afterEach(async () => {
    await plugin.stop()
  })

  it('sets status to Running on start', () => {
    plugin.start({ socketPath, pollInterval: 5000, pathPrefix: 'electrical.halpi' }, noop)
    expect(mockApp.getPluginStatus()).toBe('Running')
  })

  it('publishes dynamic delta on first poll', async () => {
    plugin.start({ socketPath, pollInterval: 5000, pathPrefix: 'electrical.halpi' }, noop)

    await wait(100)

    const deltas = mockApp.getCapturedDeltas()
    expect(deltas.length).toBeGreaterThanOrEqual(2)

    const dynamicDelta = deltas[0]
    expect(dynamicDelta.pluginId).toBe('signalk-halpi')
    const values = dynamicDelta.delta.updates[0].values as PathValue[]
    expect(values).toHaveLength(12)
  })

  it('publishes static delta on first poll', async () => {
    plugin.start({ socketPath, pollInterval: 5000, pathPrefix: 'electrical.halpi' }, noop)

    await wait(100)

    const deltas = mockApp.getCapturedDeltas()
    expect(deltas.length).toBeGreaterThanOrEqual(2)

    const staticDelta = deltas[1]
    const values = staticDelta.delta.updates[0].values as PathValue[]
    expect(values).toHaveLength(4)

    const byPath = new Map(values.map((v) => [String(v.path), v.value]))
    expect(byPath.get('electrical.halpi.daemonVersion')).toBe('1.0.0')
  })

  it('stops polling on stop', async () => {
    plugin.start({ socketPath, pollInterval: 500, pathPrefix: 'electrical.halpi' }, noop)

    // Wait for immediate first poll to complete
    await wait(100)
    await plugin.stop()

    const countAfterStop = mockApp.getCapturedDeltas().length
    // Wait longer than the poll interval to confirm no new deltas arrive
    await wait(700)
    expect(mockApp.getCapturedDeltas().length).toBe(countAfterStop)
  })

  it('uses default config values when not provided', async () => {
    plugin.start({}, noop)

    await wait(100)

    expect(mockApp.getPluginError()).toBeDefined()
  })

  it('recovers status after error clears', async () => {
    const failSocketPath = join(tmpdir(), `halpid-fail-test-${String(process.pid)}.sock`)
    try {
      unlinkSync(failSocketPath)
    } catch {
      // Ignore
    }

    // Fail enough requests to cover multiple polls, then succeed
    let requestCount = 0
    const failServer = http.createServer((req, res) => {
      requestCount++
      if (requestCount <= 6) {
        res.writeHead(500)
        res.end()
      } else if (req.url === '/values') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(mockValues))
      } else if (req.url === '/usb') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(mockUsb))
      }
    })

    await new Promise<void>((resolve) => {
      failServer.listen(failSocketPath, resolve)
    })

    try {
      plugin.start(
        { socketPath: failSocketPath, pollInterval: 200, pathPrefix: 'electrical.halpi' },
        noop
      )

      // First poll fires immediately and fails; wait long enough for it to complete
      await wait(100)
      expect(mockApp.getPluginError()).toBeDefined()

      // Wait for enough polls for the server to start succeeding (>3 polls × 200ms)
      await wait(800)
      expect(mockApp.getPluginStatus()).toBe('Running')
    } finally {
      await plugin.stop()
      await new Promise<void>((resolve, reject) => {
        failServer.close((err) => {
          if (err) reject(err)
          else resolve()
        })
      })
      try {
        unlinkSync(failSocketPath)
      } catch {
        // Ignore
      }
    }
  })
})
