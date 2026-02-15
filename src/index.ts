import type { Plugin, ServerAPI } from '@signalk/server-api'
import type { PluginConfig } from './types.js'
import { fetchValues, fetchUsbStatus } from './halpidClient.js'
import { buildDynamicDelta, buildStaticDelta } from './deltaBuilder.js'

const STATIC_POLL_DIVISOR = 60

const configSchema = {
  type: 'object' as const,
  properties: {
    pathPrefix: {
      type: 'string',
      title: 'Signal K Path Prefix',
      description: 'Prefix for all Signal K paths',
      default: 'electrical.halpi'
    }
  }
}

export default function createPlugin(app: ServerAPI): Plugin {
  let timer: ReturnType<typeof setInterval> | undefined
  let pollCounter = 0
  let polling = false
  let inError = false
  let stopped = true

  async function poll(config: PluginConfig) {
    if (polling || stopped) {
      return
    }
    polling = true

    try {
      const [values, usb] = await Promise.all([
        fetchValues(config.socketPath),
        fetchUsbStatus(config.socketPath)
      ])

      // stop() may have been called while awaiting the fetch
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (stopped) return

      const dynamicDelta = buildDynamicDelta(values, usb, config.pathPrefix)
      app.handleMessage(plugin.id, dynamicDelta)

      if (pollCounter % STATIC_POLL_DIVISOR === 0) {
        const staticDelta = buildStaticDelta(values, config.pathPrefix)
        app.handleMessage(plugin.id, staticDelta)
      }

      pollCounter++

      if (inError) {
        inError = false
        app.setPluginStatus('Running')
      }
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (stopped) return
      const message = err instanceof Error ? err.message : String(err)
      if (!inError) {
        app.setPluginError(message)
        inError = true
      }
      app.debug(`Poll error: ${message}`)
    } finally {
      polling = false
    }
  }

  const plugin: Plugin = {
    id: 'signalk-halpi',
    name: 'HALPI2 Device Monitor',
    description: 'Publishes HALPI2 power management data to Signal K via halpid daemon',

    schema: configSchema,

    start(config: object) {
      const pluginConfig: PluginConfig = {
        socketPath: (config as Partial<PluginConfig>).socketPath ?? '/run/halpid/halpid.sock',
        pollInterval: (config as Partial<PluginConfig>).pollInterval ?? 1000,
        pathPrefix: (config as Partial<PluginConfig>).pathPrefix ?? 'electrical.halpi'
      }

      app.debug('Starting HALPI2 monitor with config:', pluginConfig)
      app.setPluginStatus('Running')

      pollCounter = 0
      inError = false
      stopped = false

      // Immediate first poll (includes statics since counter is 0)
      void poll(pluginConfig)

      timer = setInterval(() => {
        void poll(pluginConfig)
      }, pluginConfig.pollInterval)
    },

    stop() {
      stopped = true
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
      pollCounter = 0
      polling = false
      inError = false
    }
  }

  return plugin
}
