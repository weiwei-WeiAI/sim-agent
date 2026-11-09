/** Persisted launch settings and read-only CAE connection views. */

/** A registered MCP associated with one engineering application. */
export interface CaeMcpConfig {
  id: string
  label: string
  sourceUrl: string
  compatibility: string
  bridgePort?: number
  provider?: 'official' | 'community'
  connection?: string
  apis?: Array<{ label: string; docsUrl: string }>
}

/** Launch parameters are configured by the user, never supplied by the model. */
export interface CaeApplicationConfig {
  label: string
  version: string
  command: string
  args: string[]
  cwd: string
  allowAgentLaunch: boolean
  mcps: CaeMcpConfig[]
}

/** Outcome codes are translated by the browser and retained in tool results. */
export type CaeLaunchCode = 'requested' | 'already_started' | 'path_required' | 'not_found' | 'invalid_path' | 'agent_disabled' | 'failed'

/** A launch acknowledgement does not assert GUI readiness or license availability. */
export interface CaeLaunchResult {
  ok: boolean
  softwareId: string
  code: CaeLaunchCode
  pid: number | null
  detail: string
}

/** One application with configuration, file availability and MCP transport status. */
export interface CaeApplicationView extends CaeApplicationConfig {
  id: string
  pathState: 'unconfigured' | 'available' | 'missing'
  launch: CaeLaunchResult | null
  mcps: Array<CaeMcpConfig & { state: string; toolCount: number }>
}

/** Current Host view; software readiness is deliberately independent of MCP status. */
export interface CaeSnapshot {
  applications: CaeApplicationView[]
}
