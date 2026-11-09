import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { en, zh, type CaeInterfaceLocaleKey } from './locales.ts'
import { CaeInterfaceIcon, CaeInterfacePage } from './views.tsx'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { CaeController, type CaePageInjected } from './controller.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** CAE interface page and navigation label. */
    caeInterface: CaeInterfaceLocaleKey
  }
}

const PANEL_ID = 'cae-interface' as MainPanelId
const NS = 'caeInterface'

/** Services used to register the localized page and its navigation entry. */
export const inject = ['slots', 'locale', 'remote', 'remote.caeManager', 'remote.settings']

/**
 * Add the software catalog immediately after Plugins in the sidebar.
 * @param ctx - The browser plugin context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-cae-interface: dictionaries')
  const t = ctx.locale.bind(NS)
  const controller = new CaeController(ctx)
  ctx.effect(() => () => { controller.dispose() }, 'ui-cae-interface: controller')
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: PANEL_ID, locale: NS,
    inject: (): CaePageInjected => ({
      hooks: { cae: controller.state }, load: controller.load, save: controller.save, launch: controller.launch,
    }),
  }, CaeInterfacePage))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: PANEL_ID, order: 5, locale: NS, label: () => t('panel'),
  }, CaeInterfaceIcon))
}
