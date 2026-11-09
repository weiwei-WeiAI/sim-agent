import { useEffect, useState, type ReactNode } from 'react'
import { Button, Modal, Switch, IconLinkOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { CaeApplicationView } from '@deepseek-ai/dsh-host-cae-manager/types'
import type { CaePageInjected, CaePageState, LaunchSettings } from './controller.ts'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import hyperworksIcon from './assets/hyperworks.png'
import ansysMechanicalIcon from './assets/ansys-mechanical.png'
import abaqusIcon from './assets/abaqus.png'
import comsolIcon from './assets/comsol.png'
import css from './page.module.css'

const softwareIcons: Readonly<Record<string, string>> = {
  hyperworks: hyperworksIcon,
  ansys: ansysMechanicalIcon,
  abaqus: abaqusIcon,
  comsol: comsolIcon,
}

/**
 * Render the software catalog with real MCP transport status and launch actions.
 * @param props - renderer-bound catalog source, actions and localized text.
 * @returns a dynamic software list with one row and a configuration dialog per application.
 */
export function CaeInterfacePage({ t, useCae, load, save, launch }: PropsLocale<'caeInterface'> & InjectFace<CaePageInjected>): ReactNode {
  const state = useCae(value => value)
  useEffect(() => { void load() }, [load])
  const mcps = state.applications.flatMap(app => app.mcps)
  return <section className={css.page} aria-label={t('panel')}>
    <div className={css.content}>
      <header className={css.header}>
        <div><h1>{t('panel')}</h1><p>{t('subtitle')}</p></div>
        <Button variant="outline" disabled={state.loading} onClick={() => { void load() }}>{t('refresh')}</Button>
      </header>
      <div className={css.overview}>
        <span>{t('overview')}</span>
        <dl className={css.metrics}>
          <div><dt>{t('softwareCount')}</dt><dd>{state.applications.length}</dd></div>
          <div><dt>{t('mcpCount')}</dt><dd>{mcps.length}</dd></div>
          <div><dt>{t('connectedCount')}</dt><dd>{mcps.filter(mcp => mcp.state === 'connected').length}</dd></div>
        </dl>
      </div>
      {state.error && <p className={css.notice} role="alert">{t('loadError')}</p>}
      {state.loading && state.applications.length === 0 ? <p role="status">{t('loading')}</p> : null}
      <div className={css.list}>
        {state.applications.map(app => <SoftwareRow key={app.id} app={app} t={t} busy={state.busy.includes(app.id)} notice={state.notices[app.id]} save={save} launch={launch} />)}
      </div>
      <p className={css.connectionNote}>{t('connectionNote')}</p>
      <p className={css.prompt}>{t('promptTitle')}<span>{t('promptExample')}</span></p>
    </div>
  </section>
}

function SoftwareRow({ app, t, busy, notice, save, launch }: PropsLocale<'caeInterface'> & {
  app: CaeApplicationView
  busy: boolean
  notice: CaePageState['notices'][string] | undefined
  save: CaePageInjected['save']
  launch: CaePageInjected['launch']
}): ReactNode {
  const [editing, setEditing] = useState(false)
  const icon = softwareIcons[app.id]
  const feedback = notice ?? (app.launch ? { code: app.launch.code, detail: app.launch.detail } : undefined)
  const command = [app.command, ...app.args].map(value => /\s/.test(value) ? JSON.stringify(value) : value).join(' ')
  return <article className={css.software} aria-label={app.label}>
    <div className={css.row}>
      <div className={css.identity}>
        <span className={css.softwareIcon} data-software={app.id} aria-hidden="true">{icon ? <img src={icon} alt="" width={32} height={32} /> : app.label.slice(0, 2).toUpperCase()}</span>
        <div><h2>{app.label}</h2><div className={css.softwareMeta}><span>{app.version || t('versionUnknown')}</span><span className={css.pathState} data-ready={app.pathState === 'available'}>{t(app.pathState)}</span></div><span className={css.agentFlag}>{t(app.allowAgentLaunch ? 'agentEnabled' : 'agentDisabled')}</span></div>
      </div>
      <div className={css.summary}>
        <div className={css.command}><span className={css.fieldLabel}>{t('launchCommand')}</span>{app.command ? <code>{command}</code> : <span className={css.muted}>{t('pathEmpty')}</span>}</div>
        <div className={css.mcpSummary}><span className={css.fieldLabel}>{t('mcpHeading')} <span>{app.mcps.length}</span></span>
          {app.mcps.length === 0 ? <span className={css.muted}>{t('noMcps')}</span> : <ul className={css.mcpPills}>{app.mcps.map(mcp => <li key={mcp.id}><span>{mcp.label}</span><McpStatus state={mcp.state} t={t} /></li>)}</ul>}
        </div>
      </div>
      <div className={css.actions}>
        <Button variant="outline" aria-haspopup="dialog" disabled={busy} onClick={() => { setEditing(true) }}>{t('configure')}</Button>
        <Button variant="primary" disabled={busy || app.pathState !== 'available'} title={app.pathState !== 'available' ? t('path_required') : undefined} onClick={() => { void launch(app.id) }}>{t(busy ? 'busy' : 'launch')}</Button>
      </div>
    </div>
    {feedback && <div className={css.notice} role="status"><span>{t(feedback.code)}</span>{feedback.code === 'save_failed' || feedback.code === 'failed' || feedback.code === 'invalid_path' ? <small>{feedback.detail}</small> : null}</div>}
    {editing && <SoftwareConfig app={app} busy={busy} notice={notice} t={t} save={save} close={() => { setEditing(false) }} />}
  </article>
}

function McpStatus({ state, t }: PropsLocale<'caeInterface'> & { state: string }): ReactNode {
  return <span className={css.mcpState} data-connected={state === 'connected'}>{t(state === 'connected' ? 'mcpConnected' : state === 'disabled' ? 'mcpDisabled' : state === 'unconfigured' ? 'mcpUnconfigured' : state === 'connecting' || state === 'reconnecting' ? 'mcpConnecting' : 'mcpFailed')}</span>
}

function SoftwareConfig({ app, t, busy, notice, save, close }: PropsLocale<'caeInterface'> & {
  app: CaeApplicationView
  busy: boolean
  notice: CaePageState['notices'][string] | undefined
  save: CaePageInjected['save']
  close: () => void
}): ReactNode {
  const [draft, setDraft] = useState<LaunchSettings>({ command: app.command, args: app.args, cwd: app.cwd, version: app.version, allowAgentLaunch: app.allowAgentLaunch })
  const [argsText, setArgsText] = useState(app.args.join('\n'))
  const formId = `cae-launch-${app.id}`
  return <Modal open title={`${app.label} · ${t('configure')}`} closeLabel={t('close')} onClose={() => { if (!busy) close() }} className={css.configDialog!} contentClassName={css.dialogContent!}
    footer={<><Button variant="ghost" disabled={busy} onClick={close}>{t('cancel')}</Button><Button type="submit" form={formId} variant="primary" disabled={busy}>{t(busy ? 'busy' : 'save')}</Button></>}>
    <div className={css.configGrid}>
      <form id={formId} className={css.form} onSubmit={event => {
        event.preventDefault()
        void save(app.id, { ...draft, args: argsText.split('\n').map(value => value.trim()).filter(Boolean) }).then(ok => { if (ok) close() })
      }}>
        <h3>{t('launchSettings')}</h3>
        <label>{t('version')}<input value={draft.version} placeholder={t('versionPlaceholder')} disabled={busy} onChange={event => { setDraft({ ...draft, version: event.target.value }) }} /></label>
        <label>{t('executable')}<input value={draft.command} placeholder={t('executablePlaceholder')} disabled={busy} onChange={event => { setDraft({ ...draft, command: event.target.value }) }} /><small>{t('executableHint')}</small></label>
        <label>{t('args')}<textarea rows={2} value={argsText} placeholder={t('argsPlaceholder')} disabled={busy} onChange={event => { setArgsText(event.target.value) }} /><small>{t('argsHint')}</small></label>
        <label>{t('cwd')}<input value={draft.cwd} placeholder={t('cwdPlaceholder')} disabled={busy} onChange={event => { setDraft({ ...draft, cwd: event.target.value }) }} /></label>
        <div className={css.switchRow}><div><span>{t('allowAgent')}</span><small>{t('allowAgentHint')}</small></div><Switch checked={draft.allowAgentLaunch} disabled={busy} label={t('allowAgent')} onChange={value => { setDraft({ ...draft, allowAgentLaunch: value }) }} /></div>
        {notice?.code === 'save_failed' && <p className={css.formError} role="alert">{t('save_failed')}<small>{notice.detail}</small></p>}
      </form>
      <section className={css.mcpDetails} aria-label={t('mcpDetails')}>
        <h3>{t('mcpDetails')} <span>{app.mcps.length}</span></h3>
        {app.mcps.length === 0 ? <p className={css.empty}>{t('noMcps')}<small>{t('noMcpsHint')}</small></p> : <ul className={css.mcpList}>{app.mcps.map(mcp => <li key={mcp.id}>
          <div className={css.mcpTitle}><a href={mcp.sourceUrl} target="_blank" rel="noreferrer">{mcp.label}</a><McpStatus state={mcp.state} t={t} /></div>
          <p>{mcp.compatibility}</p>
          <dl className={css.mcpMetadata}>
            <div><dt>{t('provider')}</dt><dd>{t(mcp.provider === 'official' ? 'official' : 'community')}</dd></div>
            <div><dt>{t('serverId')}</dt><dd><code>{mcp.id}</code></dd></div>
            {mcp.connection && <div><dt>{t('connection')}</dt><dd>{mcp.connection}</dd></div>}
            {mcp.bridgePort !== undefined && <div><dt>{t('bridge')}</dt><dd>{mcp.bridgePort}</dd></div>}
            <div><dt>{t('toolCount')}</dt><dd>{mcp.toolCount} {t('tools')}</dd></div>
            <div><dt>{t('source')}</dt><dd><a href={mcp.sourceUrl} target="_blank" rel="noreferrer">{mcp.sourceUrl}</a></dd></div>
            {(mcp.apis ?? []).map(api => <div key={api.docsUrl}><dt>{t('officialApis')}</dt><dd><a href={api.docsUrl} target="_blank" rel="noreferrer">{api.label}</a></dd></div>)}
          </dl>
        </li>)}</ul>}
        <p className={css.detailNote}>{t('connectionNote')}</p>
      </section>
    </div>
  </Modal>
}

/**
 * Render the existing link glyph in the sidebar's icon slot.
 * @param props - The icon size supplied by the sidebar.
 * @returns The sidebar icon.
 */
export function CaeInterfaceIcon({ size }: PropsRuntime<'sidebar.panellist'>): ReactNode {
  return <IconLinkOutlineRegular size={size} />
}
