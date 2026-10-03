import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import type { PathValue } from '@signalk/server-api'
import { buildDynamicDelta } from '../src/deltaBuilder.js'
import { sampleValues, sampleUsb } from './helpers/fixtures.js'

const root = join(import.meta.dirname, '..')
const TEMPLATES_KEY = 'signalk-alert-templates'
const DEFAULT_PREFIX = 'electrical.halpi'
const DEFAULT_INSTANCE = 'halpi'

interface PackageJson {
  keywords?: string[]
  [TEMPLATES_KEY]?: string
}

interface PackEntry {
  files: { path: string }[]
}

interface Template {
  id: string
  open?: string[]
  rule: {
    signal: { path: string }
    gates?: { signal: { path: string } }[]
  }
}

interface TemplateSet {
  id: string
  templates: Template[]
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as PackageJson
const templatesFile = pkg[TEMPLATES_KEY] ?? ''

describe('Alert Rules template set', () => {
  it('is declared in package.json', () => {
    expect(pkg.keywords).toContain(TEMPLATES_KEY)
    expect(templatesFile).toBe('templates.yaml')
  })

  it('exists at the declared path', () => {
    expect(existsSync(join(root, templatesFile))).toBe(true)
  })

  it('is included in the npm package', () => {
    const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: root,
      encoding: 'utf8'
    })
    const [entry] = JSON.parse(out) as PackEntry[]
    expect(entry.files.map((f) => f.path)).toContain(templatesFile)
  })

  it('is installed by the .deb build', () => {
    const action = readFileSync(join(root, '.github/actions/build-deb/action.yml'), 'utf8')
    expect(action).toMatch(/cp templates\.yaml .*system-plugins\/signalk-halpi\//)
  })

  // Alert Rules drops the whole set on any error, and a template whose path
  // the plugin does not publish makes rules that never fire.
  it('reads only paths the plugin publishes under the default prefix', () => {
    const set = parse(readFileSync(join(root, templatesFile), 'utf8')) as TemplateSet
    const published = new Set(
      (
        buildDynamicDelta(sampleValues, sampleUsb, DEFAULT_PREFIX).updates[0].values as PathValue[]
      ).map((v) => String(v.path))
    )

    expect(set.templates.length).toBeGreaterThan(0)
    for (const template of set.templates) {
      expect(template.open).toEqual(['instance'])
      const paths = [
        template.rule.signal.path,
        ...(template.rule.gates ?? []).map((g) => g.signal.path)
      ].map((p) => p.replaceAll('${instance}', DEFAULT_INSTANCE))
      for (const path of paths) {
        expect(published, `${template.id}: ${path}`).toContain(path)
      }
    }
  })
})
