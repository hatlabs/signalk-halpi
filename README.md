# signalk-halpi

Signal K server plugin for HALPI2 device monitoring via the halpid daemon.

## Overview

Polls the [halpid](https://github.com/hatlabs/halpid) daemon over a Unix socket and publishes HALPI2 power management data as Signal K deltas:

- DC input voltage, supercap voltage, input current
- MCU and PCB temperature
- Power state, watchdog status
- USB port enable states
- Hardware/firmware/daemon versions and device ID

## Installation

Install via the Signal K server plugin interface, or:

```bash
npm install signalk-halpi
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Path Prefix | `electrical.halpi` | Signal K path prefix for all data |

## Requirements

- Signal K server with `@signalk/server-api` v2.10+
- Node.js 22+
- halpid daemon running on the host

## License

Apache License 2.0 - see [LICENSE](LICENSE)

Part of the [HaLOS](https://github.com/halos-org/halos) distribution.
