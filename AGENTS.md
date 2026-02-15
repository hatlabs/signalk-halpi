# signalk-halpi - Agent Instructions

## Repository Purpose

Signal K server plugin for HALPI2 device monitoring. Polls the halpid daemon via Unix socket and publishes power management, temperature, watchdog, and USB status data as Signal K deltas.

## For Agentic Coding: Use the HaLOS Workspace

This repository should be used as part of the halos workspace for AI-assisted development:

```bash
git clone https://github.com/halos-org/halos.git
cd halos
./run repos:clone
```

See `halos/docs/` for development workflows and guidance.

## Key Files

| File | Purpose | When to Read |
|------|---------|--------------|
| `src/types.ts` | HalpidValues, HalpidUsbStatus, PluginConfig interfaces | Working with data structures |
| `src/deltaBuilder.ts` | Pure functions to build SK deltas from halpid data | Changing path mappings |
| `src/halpidClient.ts` | HTTP-over-Unix-socket client for halpid | Changing halpid communication |
| `src/index.ts` | Plugin entry point, lifecycle, poll loop | Plugin behavior changes |
| `test/helpers/MockServerAPI.ts` | Mock Signal K ServerAPI for testing | Writing tests |
| `package.json` | Dependencies, scripts, plugin metadata | Build issues |

## Project Structure

```
signalk-halpi/
├── src/
│   ├── index.ts           # Plugin entry point (lifecycle, poll loop)
│   ├── types.ts           # TypeScript interfaces
│   ├── halpidClient.ts    # Unix socket HTTP client
│   └── deltaBuilder.ts    # halpid JSON → SK Delta transformation
├── test/
│   ├── helpers/
│   │   └── MockServerAPI.ts
│   ├── deltaBuilder.test.ts
│   ├── halpidClient.test.ts
│   └── plugin.test.ts
├── .github/workflows/
│   └── pr.yml             # CI checks
├── package.json
├── tsconfig.json
├── tsconfig.lint.json
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc
├── lefthook.yml
└── LICENSE
```

## Architecture

Simple poll-transform-publish pipeline:

1. **halpidClient** — I/O boundary. `fetchValues()` and `fetchUsbStatus()` via `node:http` with `socketPath`
2. **deltaBuilder** — Pure transformation. `buildDynamicDelta()` (12 paths, every poll) and `buildStaticDelta()` (4 paths, every 60th poll)
3. **index** — Plugin wiring. `start()` fires immediate poll, sets up `setInterval`. `stop()` clears interval

Zero runtime dependencies — uses Node.js built-in `node:http` for Unix socket communication.

## SK Path Mapping

All paths under configurable prefix (default: `electrical.halpi`).

**Dynamic values** (every poll): `dcInputVoltage`, `supercapVoltage`, `inputCurrent`, `mcuTemperature`, `pcbTemperature`, `powerState`, `watchdog.enabled`, `watchdog.timeout`, `usb.port0`–`usb.port3`

**Static values** (every 60th poll): `daemonVersion`, `hardwareVersion`, `firmwareVersion`, `deviceId`

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `pathPrefix` | `electrical.halpi` | SK path prefix |

## Development Commands

```bash
./run build          # Compile TypeScript
./run test           # Run Vitest tests
./run lint           # ESLint check
./run format         # Prettier format
./run ci             # Full CI (typecheck + lint + format:check + test)
./run hooks-install  # Install lefthook pre-commit hooks
```

## Version Management

This is a pure npm package — version lives in `package.json` only. No bumpversion, no VERSION file, no Debian packaging.

## Git Workflow Policy

**Branch Workflow:** Never push to main directly — always use feature branches and PRs.

## Related

- **halpid** — The daemon this plugin reads from (runs on HALPI2 hardware)
- **signalk-server** — Signal K server (plugin host)
- **halos-marine-containers** — Marine container definitions including Signal K
- **signalk-alert-manager** — Reference implementation for SK plugin patterns

Part of the [HaLOS](https://github.com/halos-org/halos) distribution.
