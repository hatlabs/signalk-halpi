import http from 'node:http'
import type { HalpidValues, HalpidUsbStatus } from './types.js'

const REQUEST_TIMEOUT_MS = 5000

function httpGetJson<T>(socketPath: string, path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = http.get({ socketPath, path }, (res) => {
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error(`halpid ${path} returned status ${String(res.statusCode)}`))
        return
      }

      let data = ''
      res.setEncoding('utf8')
      res.on('data', (chunk: string) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as T)
        } catch (err) {
          reject(new Error(`Failed to parse halpid ${path} response: ${String(err)}`))
        }
      })
    })

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`halpid ${path} request timed out`))
    })

    req.on('error', (err) => {
      reject(new Error(`Failed to connect to halpid: ${err.message}`))
    })
  })
}

export function fetchValues(socketPath: string): Promise<HalpidValues> {
  return httpGetJson<HalpidValues>(socketPath, '/values')
}

export function fetchUsbStatus(socketPath: string): Promise<HalpidUsbStatus> {
  return httpGetJson<HalpidUsbStatus>(socketPath, '/usb')
}
