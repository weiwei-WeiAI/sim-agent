/** Sim Harness occupants for the sidebar's existing brand extension points. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { SimBrandMark, SimBrandName } from './Brand.tsx'
import { en, zh, type SimBrandLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The simulation platform's brand name and descriptor. */
    simBrand: SimBrandLocaleKey
  }
}

/** Services used by the brand's localized slot occupants. */
export const inject = ['slots', 'locale']

/**
 * Replace sidebar brand artwork while retaining the shell's navigation behavior.
 * @param ctx - Browser plugin context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register('simBrand', { en, zh }), 'ui-brand-sim: dictionaries')
  ctx.slots.inject('sidebar.brand.mark', () =>
    ctx.slots.inject('sidebar.brand.name', function* () {
      yield ctx.slots.register({ name: 'sidebar.brand.mark', priority: -100 }, SimBrandMark)
      yield ctx.slots.register({ name: 'sidebar.brand.name', priority: -100, locale: 'simBrand' }, SimBrandName)
    }))
  ctx.slots.inject('conversation.hero.brand.mark', () =>
    ctx.slots.register({ name: 'conversation.hero.brand.mark', priority: -100 }, SimBrandMark))
}
