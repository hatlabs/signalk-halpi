import type { Delta } from '@signalk/server-api'

export interface CapturedDelta {
  pluginId: string
  delta: Delta
}

export class MockServerAPI {
  private capturedDeltas: CapturedDelta[] = []
  private debugLogs: { message: unknown; args: unknown[] }[] = []
  private pluginStatus: string | undefined
  private pluginError: string | undefined

  handleMessage(pluginId: string, delta: Partial<Delta>): void {
    this.capturedDeltas.push({ pluginId, delta: delta as Delta })
  }

  debug(message: unknown, ...args: unknown[]): void {
    this.debugLogs.push({ message, args })
  }

  setPluginStatus(msg: string): void {
    this.pluginStatus = msg
    this.pluginError = undefined
  }

  setPluginError(msg: string): void {
    this.pluginError = msg
  }

  getCapturedDeltas(): CapturedDelta[] {
    return [...this.capturedDeltas]
  }

  getDebugLogs(): { message: unknown; args: unknown[] }[] {
    return [...this.debugLogs]
  }

  getPluginStatus(): string | undefined {
    return this.pluginStatus
  }

  getPluginError(): string | undefined {
    return this.pluginError
  }

  reset(): void {
    this.capturedDeltas = []
    this.debugLogs = []
    this.pluginStatus = undefined
    this.pluginError = undefined
  }
}
