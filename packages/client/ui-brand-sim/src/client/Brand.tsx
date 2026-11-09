import type { CSSProperties } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import css from './brand.module.css'

/**
 * Show the source logo's red symbol in the collapsed sidebar rail.
 * @param props - Mark size supplied by the sidebar.
 * @returns a decorative, locally packaged brand symbol.
 */
export function SimBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return <span className={css.mark} aria-hidden="true" style={{ '--sim-mark-size': `${size}px` } as CSSProperties} />
}

/**
 * Combine the supplied xFusion artwork with the simulation workspace name.
 * @param props - Renderer-bound identity dictionary.
 * @returns the expanded two-line identity.
 */
export function SimBrandName({ t }: PropsLocale<'simBrand'>) {
  return <span className={css.identity}>
    <span className={css.signature}>
      <span className={css.logo} aria-hidden="true" />
      <span className={css.descriptor}>{t('descriptor')}</span>
    </span>
    <span className={css.name}>{t('name')}</span>
  </span>
}
