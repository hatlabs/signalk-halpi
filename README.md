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

## Alert templates

The package ships a template set for the [Alert Rules](https://github.com/hatlabs/signalk-alert-rules) plugin, in [`templates.yaml`](templates.yaml). With both installed, Alert Rules' Add rule offers the HALPI2 set:

| Template | Raises |
|----------|--------|
| `input-voltage-low` | A warning when the input supply stays below the recommended range |
| `temperature-high` | A warning, then an alarm, when the board runs hot |
| `not-reporting` | A warning when halpid or this plugin stops reporting; needs the Signal K server to enforce data timeouts |
| `backup-not-charged` | A caution when the supercapacitor backup does not charge while input power is good |

Each template's description and limits are in [`templates.yaml`](templates.yaml); the limits are starting points to adjust when adding the rule.

Each template asks for an instance: pick `halpi`. The templates read `electrical.<instance>.…`, so with a changed path prefix they fit only a prefix of the form `electrical.<name>`, and the instance is `<name>`.

## Requirements

- Signal K server with `@signalk/server-api` v2.10+
- Node.js 22+
- halpid daemon running on the host

## License

Apache License 2.0 - see [LICENSE](LICENSE)

Part of the [HaLOS](https://github.com/halos-org/halos) distribution.
