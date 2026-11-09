/** Detached application launch with bounded early-failure observation. */
import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process'
import { isAbsolute, win32 } from 'node:path'
import { scrubbedParentEnv } from '@deepseek-ai/dsh-subprocess'
interface LaunchCommand { command: string; args: readonly string[]; cwd: string }

/**
 * Resolve an executable or Windows batch launcher without accepting shell code.
 * @param app - user-owned absolute path and separated arguments.
 * @param platform - platform whose launcher rules apply.
 * @returns spawn arguments with explicit Windows quoting for batch files.
 */
export function launchSpec(app: LaunchCommand, platform = process.platform): { command: string; args: string[]; options: SpawnOptions } {
  const absolute = platform === 'win32'
    ? win32.isAbsolute(app.command) && /^(?:[A-Za-z]:[\\/]|[\\/]{2}[^\\/]+[\\/]+[^\\/]+)/.test(app.command)
    : isAbsolute(app.command)
  if (!absolute || /[\r\n\0]/.test(app.command)) throw new Error('The application path must be absolute.')
  if (app.cwd && !(platform === 'win32' ? win32.isAbsolute(app.cwd) : isAbsolute(app.cwd))) throw new Error('The working directory must be absolute.')
  const options: SpawnOptions = {
    detached: true, stdio: 'ignore', windowsHide: true,
    env: scrubbedParentEnv(), ...(app.cwd ? { cwd: app.cwd } : {}),
  }
  if (platform === 'win32' && /\.(bat|cmd)$/i.test(app.command)) {
    // cmd expands percent variables even inside quotes. Refuse all metacharacters
    // instead of interpreting configuration as a command line.
    const parts = [app.command, ...app.args]
    if (parts.some(part => /["%!?&|<>^\r\n\0]/.test(part))) throw new Error('Batch paths and arguments cannot contain shell metacharacters.')
    return {
      command: win32.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'cmd.exe'),
      args: ['/d', '/s', '/c', `"${parts.map(part => `"${part}"`).join(' ')}"`],
      options: { ...options, windowsVerbatimArguments: true },
    }
  }
  if (platform === 'win32' && !/\.exe$/i.test(app.command)) throw new Error('Select an .exe, .bat or .cmd launcher.')
  return { command: app.command, args: [...app.args], options }
}

/**
 * Start a visible engineering application; the application outlives the Host.
 * @param app - configured application.
 * @param watchMs - duration for detecting immediate startup failures.
 * @param signal - cancellation before launching; an accepted launch is not killed.
 * @returns the child handle after the startup observation window.
 */
export function startApplication(app: LaunchCommand, watchMs: number, signal: AbortSignal): Promise<ChildProcess> {
  signal.throwIfAborted()
  const spec = launchSpec(app)
  return new Promise((resolve, reject) => {
    const child = spawn(spec.command, spec.args, spec.options)
    let timer: ReturnType<typeof setTimeout> | undefined
    const cleanup = (): void => { clearTimeout(timer); child.removeListener('error', failed); child.removeListener('exit', exited) }
    const failed = (error: Error): void => { cleanup(); reject(error) }
    const accepted = (): void => { cleanup(); child.unref(); resolve(child) }
    const exited = (code: number | null): void => {
      if (code !== 0) failed(new Error(`Application launcher exited with code ${String(code)}.`))
      else accepted()
    }
    child.once('error', failed)
    child.once('exit', exited)
    child.once('spawn', () => { timer = setTimeout(accepted, watchMs) })
  })
}
