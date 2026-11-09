/** CAE settings and Agent launch behavior through a real profile and Loader. */
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it, onTestFinished } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { initProfile, mountRootInclude, readProfilePatches, type ProfileContext } from '@deepseek-ai/dsh-app-boot'
import ConfigEditor from '@deepseek-ai/dsh-config-editor'
import Settings from '@deepseek-ai/dsh-settings'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import Tools from '@deepseek-ai/dsh-tools'
import McpManager from '@deepseek-ai/dsh-mcp-manager'
import CaeManager from '../src/index.ts'

async function profileFixture() {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'dsh-cae-test-')))
  const contexts: Context[] = []
  onTestFinished(async () => {
    for (const ctx of contexts) await ctx.fiber.dispose()
    if (!resolve(home).startsWith(resolve(tmpdir()) + '/') && !resolve(home).startsWith(resolve(tmpdir()) + '\\')) throw new Error('Unexpected temporary directory.')
    await rm(home, { recursive: true, force: true })
  })
  const dir = join(home, 'profile')
  initProfile(dir, ['fixture-cae'])
  const bundle = join(dir, 'node_modules', 'fixture-cae')
  mkdirSync(bundle, { recursive: true })
  writeFileSync(join(home, 'package.json'), '{"name":"cae-test"}\n')
  writeFileSync(join(bundle, 'package.json'), JSON.stringify({ name: 'fixture-cae', version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } } }))
  writeFileSync(join(bundle, 'cordis.patch.yml'), JSON.stringify([{ insert: [{
    id: 'cae-manager', name: 'cordis:cae-manager', config: { launchWatchMs: 100, applications: {
      abaqus: { label: 'Abaqus', version: '2021', command: '', allowAgentLaunch: true },
    } },
  }] }]))
  writeFileSync(join(dir, 'cordis.yml'), '[]\n')
  const profile: ProfileContext = { name: 'test', startedBundles: ['fixture-cae'], dir, patchPath: join(dir, 'cordis.patch.yml'), installAnchor: join(home, 'package.json'), cwd: home, home, overlays: [], telemetryDisabledEnv: undefined }
  const start = async () => {
    const ctx = new Context()
    contexts.push(ctx)
    ctx.baseUrl = pathToFileURL(home).href + '/'
    ctx.provide('profileContext', profile)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(Tools)
    await ctx.plugin(McpManager)
    await ctx.plugin(Loader)
    ctx.loader.builtins['cae-manager'] = CaeManager
    await ctx.plugin(ConfigEditor)
    await ctx.plugin(Settings)
    await mountRootInclude(ctx, join(dir, 'cordis.yml'), readProfilePatches('test', profile))
    await ctx.loader.await()
    return ctx
  }
  return { ctx: await start(), start }
}

describe('CAE real profile', () => {
  it('retains MCP provenance and API metadata across profile persistence without a TCP port', async () => {
    const { ctx, start } = await profileFixture()
    const mcp = { id: 'comsol', label: 'COMSOL MCP', sourceUrl: 'https://github.com/Cai-aa/CAE-Agent-Hub', compatibility: 'Target installation required', provider: 'community', connection: 'Java API via MPh', apis: [{ label: 'COMSOL Java API', docsUrl: 'https://doc.comsol.com/' }] }
    const revision = ctx.settings.describe().find(row => row.ns === 'cae-manager')!.revision
    await ctx.settings.update('cae-manager', { applications: { abaqus: { mcps: [mcp] } } }, revision)
    expect((await ctx.caeManager.snapshot()).applications[0]?.mcps[0]).toMatchObject({ ...mcp, state: 'unconfigured', toolCount: 0 })
    await ctx.fiber.dispose()
    const restored = await start()
    const entry = (await restored.caeManager.snapshot()).applications[0]?.mcps[0]
    expect(entry).toMatchObject(mcp)
    expect(entry?.bridgePort).toBeUndefined()
  })

  it('publishes a missing-path result to Agent callers without starting an application', async () => {
    const { ctx } = await profileFixture()
    expect((await ctx.caeManager.snapshot()).applications[0]).toMatchObject({ id: 'abaqus', pathState: 'unconfigured', mcps: [] })
    expect(await ctx.caeManager.launch('abaqus', 'agent', new AbortController().signal)).toMatchInlineSnapshot(`
      {
        "code": "path_required",
        "detail": "Set the software executable path in CAE interfaces first.",
        "ok": false,
        "pid": null,
        "softwareId": "abaqus",
      }
    `)
    expect(ctx.tools.get('cae_launch_software')).toBeDefined()
    const entry = ctx.configEditor.entries().find(row => row.options.id === 'cae-manager')!
    await entry.fiber!.dispose()
    expect(ctx.tools.get('cae_launch_software')).toBeUndefined()
    expect(ctx.tools.get('cae_list_software')).toBeUndefined()
  })

  it('persists a launch configuration, enforces Agent opt-out and restores it on restart', async () => {
    const { ctx, start } = await profileFixture()
    const revision = ctx.settings.describe().find(row => row.ns === 'cae-manager')!.revision
    await ctx.settings.update('cae-manager', { applications: { abaqus: { command: process.execPath, args: ['-e', 'process.exit(0)'], allowAgentLaunch: false } } }, revision)
    expect((await ctx.caeManager.snapshot()).applications[0]).toMatchObject({ pathState: 'available', allowAgentLaunch: false })
    expect(await ctx.caeManager.launch('abaqus', 'agent', new AbortController().signal)).toMatchObject({ ok: false, code: 'agent_disabled' })
    await expect(ctx.settings.update('cae-manager', { applications: {} }, revision)).rejects.toThrow('changed since it was read')
    const launches = await Promise.all([ctx.caeManager.launch('abaqus', 'manual', new AbortController().signal), ctx.caeManager.launch('abaqus', 'manual', new AbortController().signal)])
    expect(launches[0]).toMatchObject({ ok: true, code: 'requested' })
    expect(launches[0]?.pid).toBe(launches[1]?.pid)
    expect((await ctx.caeManager.snapshot()).applications[0]?.launch?.code).toBe('requested')
    await ctx.settings.update('cae-manager', { applications: { abaqus: { args: ['-e', 'process.exit(2)'] } } }, ctx.settings.describe().find(row => row.ns === 'cae-manager')!.revision)
    expect((await ctx.caeManager.snapshot()).applications[0]?.launch).toBeNull()
    await ctx.fiber.dispose()
    const restored = await start()
    expect((await restored.caeManager.snapshot()).applications[0]).toMatchObject({ command: process.execPath, allowAgentLaunch: false })
  })
})
