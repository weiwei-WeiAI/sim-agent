/** Real executable launch and Windows batch quoting behavior. */
import { describe, expect, it } from 'vitest'
import { launchSpec, startApplication } from '../src/launcher.ts'
import type { CaeApplicationConfig } from '../src/types.ts'

const app: CaeApplicationConfig = { label: 'Fixture', version: '', command: process.execPath, args: [], cwd: '', allowAgentLaunch: true, mcps: [] }

describe('CAE application launch', () => {
  it('keeps native executable arguments separate from the executable path', () => {
    const spec = launchSpec({ ...app, command: 'C:/Program Files/CAE/app.exe', args: ['a file with spaces', '&'] }, 'win32')
    expect(spec.command).toBe('C:/Program Files/CAE/app.exe')
    expect(spec.args).toEqual(['a file with spaces', '&'])
    expect(spec.options.shell).toBeUndefined()
  })

  it('quotes batch paths containing spaces and Chinese characters without evaluating shell syntax', () => {
    const spec = launchSpec({ ...app, command: 'D:/仿真 软件/abq2021.bat', args: ['cae', 'database=D:/CAE/a model.cae'] }, 'win32')
    expect(spec.args).toEqual(['/d', '/s', '/c', '""D:/仿真 软件/abq2021.bat" "cae" "database=D:/CAE/a model.cae""'])
    expect(spec.options.windowsVerbatimArguments).toBe(true)
  })

  it.each(['%TEMP%', 'cae & echo bad', '"bad', 'x\ny', 'a|b'])('rejects batch argument shell syntax: %s', argument => {
    expect(() => launchSpec({ ...app, command: 'D:/CAE/abaqus.cmd', args: [argument] }, 'win32')).toThrow('metacharacters')
  })

  it('rejects relative paths and non-launcher file types', () => {
    expect(() => launchSpec({ ...app, command: 'abaqus.exe' }, 'win32')).toThrow('absolute')
    expect(() => launchSpec({ ...app, command: 'D:/CAE/README.txt' }, 'win32')).toThrow('launcher')
  })

  it('observes successful and failed real process starts', async () => {
    const child = await startApplication({ ...app, args: ['-e', 'process.exit(0)'] }, 500, new AbortController().signal)
    expect(child.pid).toBeGreaterThan(0)
    await expect(startApplication({ ...app, args: ['-e', 'process.exit(9)'] }, 2000, new AbortController().signal)).rejects.toThrow('code 9')
  })

  it('does not start a process for an already cancelled request', async () => {
    const abort = new AbortController()
    abort.abort()
    expect(() => startApplication(app, 100, abort.signal)).toThrow()
  })
})
