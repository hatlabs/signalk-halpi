import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { unlinkSync } from 'node:fs'
import { fetchValues, fetchUsbStatus } from '../src/halpidClient.js'
import type { HalpidValues, HalpidUsbStatus } from '../src/types.js'

const socketPath = join(tmpdir(), `halpid-test-${String(process.pid)}.sock`)

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

beforeAll(async () => {
  // Clean up stale socket file
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
    } else if (req.url === '/bad-json') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('not json')
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

describe('fetchValues', () => {
  it('returns parsed values from /values endpoint', async () => {
    const result = await fetchValues(socketPath)
    expect(result).toEqual(mockValues)
  })
})

describe('fetchUsbStatus', () => {
  it('returns parsed USB status from /usb endpoint', async () => {
    const result = await fetchUsbStatus(socketPath)
    expect(result).toEqual(mockUsb)
  })
})

describe('error handling', () => {
  it('rejects when socket does not exist', async () => {
    await expect(fetchValues('/nonexistent/socket.sock')).rejects.toThrow(
      'Failed to connect to halpid'
    )
  })

  it('rejects on non-200 status', async () => {
    const errSocketPath = join(tmpdir(), `halpid-err-test-${String(process.pid)}.sock`)
    try {
      unlinkSync(errSocketPath)
    } catch {
      // Ignore
    }

    const errServer = http.createServer((_req, res) => {
      res.writeHead(500)
      res.end()
    })

    await new Promise<void>((resolve) => {
      errServer.listen(errSocketPath, resolve)
    })

    try {
      await expect(fetchValues(errSocketPath)).rejects.toThrow('returned status 500')
    } finally {
      await new Promise<void>((resolve, reject) => {
        errServer.close((err) => {
          if (err) reject(err)
          else resolve()
        })
      })
      try {
        unlinkSync(errSocketPath)
      } catch {
        // Ignore
      }
    }
  })

  it('rejects on invalid JSON response', async () => {
    const badSocketPath = join(tmpdir(), `halpid-bad-test-${String(process.pid)}.sock`)
    try {
      unlinkSync(badSocketPath)
    } catch {
      // Ignore
    }

    const badServer = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end('not json')
    })

    await new Promise<void>((resolve) => {
      badServer.listen(badSocketPath, resolve)
    })

    try {
      await expect(fetchValues(badSocketPath)).rejects.toThrow('Failed to parse')
    } finally {
      await new Promise<void>((resolve, reject) => {
        badServer.close((err) => {
          if (err) reject(err)
          else resolve()
        })
      })
      try {
        unlinkSync(badSocketPath)
      } catch {
        // Ignore
      }
    }
  })
})
