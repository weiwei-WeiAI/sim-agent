/** Browser owner of CAE catalog snapshots and configuration actions. */
import type { Context } from '@deepseek-ai/cordis'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { CaeApplicationConfig, CaeApplicationView, CaeLaunchCode } from '@deepseek-ai/dsh-host-cae-manager/types'

/** Editing fields exposed by the software launch form. */
export type LaunchSettings = Pick<CaeApplicationConfig, 'command' | 'args' | 'cwd' | 'version' | 'allowAgentLaunch'>

/** Shared page state; drafts remain local to each software form. */
export interface CaePageState {
  applications: CaeApplicationView[]
  loading: boolean
  error: string | null
  busy: string[]
  notices: Record<string, { code: CaeLaunchCode | 'saved' | 'save_failed'; detail: string }>
}

/** One controller per plugin instance, shared through injected observable data. */
export class CaeController {
  readonly state = createSnapshotStore<CaePageState>({ applications: [], loading: false, error: null, busy: [], notices: {} })
  private revision: number | undefined
  private namespace = 'cae-manager'
  private disposed = false
  private readonly lifetime = new AbortController()
  private loading: Promise<void> | undefined

  /** @param ctx - browser context with generated CAE and settings Remote methods. */
  constructor(private readonly ctx: Context) {}

  /** @returns settlement after refreshing the catalog and configuration revision. */
  load = (): Promise<void> => {
    if (this.loading) return this.loading
    this.state.update(state => { state.loading = true })
    this.loading = (async () => {
      try {
        const [snapshot, settings] = await Promise.all([this.ctx.remote.caeManager.snapshot(), this.ctx.remote.settings.describe()])
        if (!snapshot.ok) throw new Error(snapshot.error.message)
        if (!settings.ok) throw new Error(settings.error.message)
        const namespace = settings.value.namespaces.find(item => item.ns === 'cae-manager' || item.ns.endsWith(':cae-manager'))
        if (!namespace) throw new Error('CAE configuration is unavailable.')
        if (this.disposed) return
        this.namespace = namespace.ns
        this.revision = namespace.revision
        this.state.update(state => { state.applications = snapshot.value.applications; state.error = null })
      } catch (error) {
        if (!this.disposed) this.state.update(state => { state.error = error instanceof Error ? error.message : String(error) })
      } finally {
        if (!this.disposed) this.state.update(state => { state.loading = false })
        this.loading = undefined
      }
    })()
    return this.loading
  }

  /**
   * Persist only launch fields and refuse overwriting a concurrently changed profile.
   * @param id - software catalog key.
   * @param settings - validated form values.
   * @returns whether the form may close after a successful save.
   */
  save = async (id: string, settings: LaunchSettings): Promise<boolean> => {
    if (this.state.getSnapshot().busy.includes(id)) return false
    this.state.update(state => { state.busy.push(id); delete state.notices[id] })
    try {
      const updated = await this.ctx.remote.settings.mutate(this.namespace, [
        { op: 'set', path: ['applications', id, 'command'], value: settings.command.trim() },
        { op: 'set', path: ['applications', id, 'args'], value: settings.args },
        { op: 'set', path: ['applications', id, 'cwd'], value: settings.cwd.trim() },
        { op: 'set', path: ['applications', id, 'version'], value: settings.version.trim() },
        { op: 'set', path: ['applications', id, 'allowAgentLaunch'], value: settings.allowAgentLaunch },
      ], this.revision)
      if (!updated.ok) throw new Error(updated.error.message)
      this.revision = updated.value.revision
      await this.load()
      if (!this.disposed) this.state.update(state => { state.notices[id] = { code: 'saved', detail: '' } })
      return true
    } catch (error) {
      if (!this.disposed) this.state.update(state => { state.notices[id] = { code: 'save_failed', detail: error instanceof Error ? error.message : String(error) } })
      return false
    } finally {
      if (!this.disposed) this.state.update(state => { state.busy = state.busy.filter(item => item !== id) })
    }
  }

  /** @param id - configured software to launch from a direct user gesture. */
  launch = async (id: string): Promise<void> => {
    if (this.state.getSnapshot().busy.includes(id)) return
    this.state.update(state => { state.busy.push(id); delete state.notices[id] })
    try {
      const result = await this.ctx.remote.caeManager.launch(id, 'manual', this.lifetime.signal)
      if (!result.ok) throw new Error(result.error.message)
      if (!this.disposed) this.state.update(state => { state.notices[id] = { code: result.value.code, detail: result.value.detail } })
      await this.load()
    } catch (error) {
      if (!this.disposed) this.state.update(state => { state.notices[id] = { code: 'failed', detail: error instanceof Error ? error.message : String(error) } })
    } finally {
      if (!this.disposed) this.state.update(state => { state.busy = state.busy.filter(item => item !== id) })
    }
  }

  /** Stop accepting asynchronous browser updates when the plugin unloads. */
  dispose(): void { this.disposed = true; this.lifetime.abort() }
}

/** Plain actions and a renderer-bound snapshot source supplied to the page. */
export interface CaePageInjected {
  hooks: { cae: CaeController['state'] }
  load: CaeController['load']
  save: CaeController['save']
  launch: CaeController['launch']
}
