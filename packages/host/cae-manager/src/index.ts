/** CAE application catalog, desktop launching, and Agent launch tools. */
import { stat } from 'node:fs/promises'
import type { ChildProcess } from 'node:child_process'
import { Context, type Volatile } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-mcp-manager'
import { launchSpec, startApplication } from './launcher.ts'
import type { CaeApplicationConfig, CaeSnapshot, CaeLaunchResult } from './types.ts'

/** Profile-owned launch settings; tools can only select existing application ids. */
export interface Config {
  applications: Volatile<Record<string, CaeApplicationConfig>>
  launchWatchMs: number
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Host owner of configured CAE applications and their launch actions. */
    caeManager: CaeManager
  }
}

const applicationSchema = z.object({
  label: z.string().required(), version: z.string().default(''),
  command: z.string().default(''), args: z.array(String).default([]), cwd: z.string().default(''),
  allowAgentLaunch: z.boolean().default(true),
  mcps: z.array(z.object({
    id: z.string().required(), label: z.string().required(), sourceUrl: z.string().required(),
    compatibility: z.string().default(''), bridgePort: z.number().min(1).max(65535),
    provider: z.union(['official', 'community']).default('community'), connection: z.string().default(''),
    apis: z.array(z.object({ label: z.string().required(), docsUrl: z.string().required() })).default([]),
  })).default([]),
})

function launchKey(app: { command: string; args: readonly string[]; cwd: string }): string {
  return JSON.stringify([app.command, app.args, app.cwd])
}

/** One shared owner for the UI and model-visible launch operations. */
export default class CaeManager extends TypertRemoteService {
  static inject = ['mcpManager', 'tools']
  static Config = z.object({
    applications: z.dict(applicationSchema).default({}).volatile(),
    launchWatchMs: z.number().min(100).max(10000).default(1500),
  }) as z<Config>

  private readonly pending = new Map<string, { key: string; operation: Promise<CaeLaunchResult> }>()
  private readonly launches = new Map<string, { key: string; child: ChildProcess | undefined; outcome: CaeLaunchResult }>()

  /**
   * @param ctx - Host context with the shared tool and MCP registries.
   * @param config - validated profile settings.
   */
  constructor(ctx: Context, public config: Config) {
    super(ctx, 'caeManager')
    ctx.tools.register(defineTool({
      name: 'cae_list_software',
      description: 'List configured CAE applications, executable availability and associated MCP servers. MCP connected means the adapter is running, not that the CAE GUI or license is ready. Check this before launching software for a simulation request.',
      parameters: {},
      output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
      execute: async () => JSON.stringify(await this.snapshot()),
    }))
    ctx.tools.register(defineTool({
      name: 'cae_launch_software',
      description: 'Open a configured CAE application when the user asks to open it or needs it for a simulation task. Use a softwareId from cae_list_software. The user must have configured its path and allowed Agent launch. Do not invent paths or repeatedly launch after an accepted request. After launching, check the chosen CAE MCP ping before modeling or solving; a launch acknowledgement is not GUI readiness.',
      parameters: { softwareId: { type: 'string', required: true, description: 'Configured software id, e.g. abaqus, ansys, hyperworks or comsol.' } },
      output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
      execute: async (args, exec) => JSON.stringify(await this.launch(args.softwareId, 'agent', exec.signal)),
    }))
    ctx.effect(() => () => {
      // User applications deliberately outlive a page reload or Host shutdown.
      for (const launch of this.launches.values()) launch.child?.unref()
    }, 'cae-manager: detach applications')
  }

  /** @returns application settings, file availability and current MCP transport state. */
  @Remote
  async snapshot(): Promise<CaeSnapshot> {
    const servers = this.ctx.mcpManager.list()
    const applications = await Promise.all(Object.entries(this.config.applications.get()).map(async ([id, app]) => {
      let pathState: 'unconfigured' | 'available' | 'missing' = 'unconfigured'
      if (app.command) {
        try { pathState = (await stat(app.command)).isFile() ? 'available' : 'missing' }
        catch (error) {
          if (!(error instanceof Error)) throw error
          pathState = 'missing'
        }
      }
      const previous = this.launches.get(id)
      return {
        ...app, args: [...app.args], id, pathState, launch: previous?.key === launchKey(app) ? previous.outcome : null,
        mcps: app.mcps.map(mcp => {
          const server = servers.find(item => item.name === mcp.id && item.configured)
          return { ...mcp, apis: (mcp.apis ?? []).map(api => ({ ...api })), state: server?.status.state ?? 'unconfigured', toolCount: server?.status.state === 'connected' ? server.status.toolCount : 0 }
        }),
      }
    }))
    return { applications }
  }

  /**
   * Launch only the selected, user-configured application, collapsing concurrent requests.
   * @param softwareId - catalog key, not an executable path.
   * @param trigger - manual UI gesture or model tool action.
   * @param signal - cancellation before dispatch; accepted desktop launches remain open.
   * @returns acknowledged startup or an actionable refusal; never asserts solver readiness.
   */
  @Remote
  async launch(softwareId: string, trigger: 'manual' | 'agent', signal: AbortSignal): Promise<CaeLaunchResult> {
    const result = (code: CaeLaunchResult['code'], detail = '', pid: number | null = null): CaeLaunchResult => ({
      ok: code === 'requested' || code === 'already_started', softwareId, code, detail, pid,
    })
    const app = this.config.applications.get()[softwareId]
    if (!app) return result('not_found', 'Unknown CAE software id.')
    if (trigger === 'agent' && !app.allowAgentLaunch) return result('agent_disabled', 'Enable Agent launch in CAE interfaces first.')
    if (!app.command) return result('path_required', 'Set the software executable path in CAE interfaces first.')
    const key = launchKey(app)
    const waiting = this.pending.get(softwareId)
    if (waiting) {
      if (waiting.key === key) return waiting.operation
      await waiting.operation
      return this.launch(softwareId, trigger, signal)
    }
    const previousLaunch = this.launches.get(softwareId)
    const previous = previousLaunch?.key === key ? previousLaunch.child : undefined
    if (previous && previous.exitCode === null && previous.signalCode === null) return result('already_started', 'The previous launcher process is still active.', previous.pid ?? null)
    let child: ChildProcess | undefined
    const operation = (async (): Promise<CaeLaunchResult> => {
      try { launchSpec(app) }
      catch (error) { return result('invalid_path', error instanceof Error ? error.message : String(error)) }
      try {
        if (!(await stat(app.command)).isFile()) return result('not_found', 'The configured launcher is not a file.')
        signal.throwIfAborted()
        child = await startApplication(app, this.config.launchWatchMs, signal)
        return result('requested', 'Application launch accepted. Check its GUI and MCP bridge before simulation.', child.pid ?? null)
      } catch (error) {
        return result('failed', error instanceof Error ? error.message : String(error))
      }
    })()
    this.pending.set(softwareId, { key, operation })
    try {
      const outcome = await operation
      this.launches.set(softwareId, { key, child, outcome })
      return outcome
    } finally { this.pending.delete(softwareId) }
  }
}
