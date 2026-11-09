// @vitest-environment jsdom
/** Software rows expose a dynamic MCP inventory and isolated configuration dialogs. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { bindSnapshotSelector, makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type {} from '../src/client/index.ts'
import { CaeInterfacePage } from '../src/client/views.tsx'
import type { CaePageState } from '../src/client/controller.ts'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

function fixture() {
  const state = createSnapshotStore<CaePageState>({ loading: false, busy: [], notices: {}, error: null, applications: [{
    id: 'abaqus', label: 'Abaqus', version: '2021', command: '', args: ['cae'], cwd: '', allowAgentLaunch: true, pathState: 'unconfigured', launch: null,
    mcps: [{ id: 'abaqus_control', label: 'Abaqus-Control-MCP', sourceUrl: 'https://github.com/Whfkl/Abaqus-Control-MCP', compatibility: '2021', bridgePort: 48153, state: 'connected', toolCount: 11 }],
  }] })
  const save = vi.fn(async () => true)
  const launch = vi.fn(async () => {})
  render(<CaeInterfacePage t={makeTranslate(zh)} useCae={bindSnapshotSelector(state)} load={vi.fn(async () => {})} save={save} launch={launch} />)
  return { state, save, launch }
}

describe('CAE MCP page', () => {
  it('shows a connected MCP while keeping software launch disabled until a path is configured', () => {
    fixture()
    expect(screen.getByRole('heading', { name: 'CAE MCP' })).toBeTruthy()
    expect(screen.getByText('Abaqus-Control-MCP')).toBeTruthy()
    expect(screen.getByText('待配置路径')).toBeTruthy()
    expect(screen.getByRole('button', { name: '一键启动' }).hasAttribute('disabled')).toBe(true)
  })

  it('opens MCP details from the row and dismisses unsaved software settings', async () => {
    const { save } = fixture()
    fireEvent.click(screen.getByRole('button', { name: '配置' }))
    const dialog = screen.getByRole('dialog', { name: 'Abaqus · 配置' })
    expect(within(dialog).getByRole('link', { name: 'Abaqus-Control-MCP' })).toBeTruthy()
    expect(within(dialog).getByText('11 个工具')).toBeTruthy()
    expect(within(dialog).getByText('48153')).toBeTruthy()
    expect(within(dialog).getByText('abaqus_control')).toBeTruthy()
    fireEvent.change(within(dialog).getByLabelText(/启动文件路径/), { target: { value: 'D:/unsaved.bat' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(save).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '配置' }))
    expect(screen.getByLabelText<HTMLInputElement>(/启动文件路径/).value).toBe('')
  })

  it('renders every configured software and MCP without imposing a fixed count', () => {
    const { state } = fixture()
    const app = state.getSnapshot().applications[0]!
    act(() => state.update(value => { value.applications = Array.from({ length: 6 }, (_, index) => ({ ...app, id: `software-${index}`, label: `Software ${index}`, mcps: Array.from({ length: index }, (_, mcp) => ({ ...app.mcps[0]!, id: `mcp-${mcp}`, label: `MCP ${mcp}` })) })) }))
    expect(screen.getAllByRole('article')).toHaveLength(6)
    const last = within(screen.getByRole('article', { name: 'Software 5' }))
    expect(last.getAllByRole('listitem')).toHaveLength(5)
    expect(last.getByRole('button', { name: '配置' })).toBeTruthy()
    expect(last.getByRole('button', { name: '一键启动' })).toBeTruthy()
  })

  it('saves separate launcher arguments and the Agent launch preference', async () => {
    const { save } = fixture()
    fireEvent.click(screen.getByRole('button', { name: '配置' }))
    fireEvent.change(screen.getByLabelText(/启动文件路径/), { target: { value: 'D:/CAE/abq2021.bat' } })
    fireEvent.change(screen.getByLabelText(/启动参数/), { target: { value: 'cae\ndatabase=D:/a model.cae' } })
    fireEvent.click(screen.getByRole('switch', { name: '允许根据对话提示启动' }))
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }))
    await waitFor(() => expect(save).toHaveBeenCalledWith('abaqus', { command: 'D:/CAE/abq2021.bat', args: ['cae', 'database=D:/a model.cae'], cwd: '', version: '2021', allowAgentLaunch: false }))
    await waitFor(() => expect(screen.queryByLabelText(/启动文件路径/)).toBeNull())
  })

  it('distinguishes official MCPs and linked APIs without inventing a bridge port', () => {
    const { state } = fixture()
    act(() => state.update(value => {
      value.applications[0]!.mcps = [{ id: 'mechanical', label: 'PyMechanical MCP', sourceUrl: 'https://github.com/ansys/pymechanical-mcp', compatibility: '2024 R2+', provider: 'official', connection: 'gRPC', apis: [{ label: 'PyMechanical', docsUrl: 'https://mechanical.docs.pyansys.com/' }], state: 'connected', toolCount: 28 }]
    }))
    fireEvent.click(screen.getByRole('button', { name: '配置' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByText('官方 MCP')).toBeTruthy()
    expect(dialog.getByRole('link', { name: 'PyMechanical' }).getAttribute('href')).toBe('https://mechanical.docs.pyansys.com/')
    expect(dialog.getByText('gRPC')).toBeTruthy()
    expect(dialog.queryByText('桥接端口')).toBeNull()
    expect(screen.getByRole('button', { name: '一键启动' }).hasAttribute('disabled')).toBe(true)
  })

  it('keeps a failed save open with the draft and its error visible', async () => {
    const { save, state } = fixture()
    save.mockResolvedValueOnce(false)
    fireEvent.click(screen.getByRole('button', { name: '配置' }))
    fireEvent.change(screen.getByLabelText(/启动文件路径/), { target: { value: 'D:/CAE/abq2021.bat' } })
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }))
    await waitFor(() => expect(save).toHaveBeenCalled())
    act(() => state.update(value => { value.notices.abaqus = { code: 'save_failed', detail: 'Concurrent settings update' } }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText<HTMLInputElement>(/启动文件路径/).value).toBe('D:/CAE/abq2021.bat')
    expect(within(dialog).getByRole('alert').textContent).toContain('保存失败')
  })
})
