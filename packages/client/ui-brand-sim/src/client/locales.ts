/** Product identity shared across interface languages. */
export const en = {
  name: 'Sim Harness',
  descriptor: 'CAE workspace',
}

/** Simplified Chinese identity; the product name is a proper noun. */
export const zh: Record<keyof typeof en, string> = {
  name: 'Sim Harness',
  descriptor: '建模仿真助手',
}

/** Locale keys owned by the Sim Harness identity. */
export type SimBrandLocaleKey = keyof typeof en
