export function stripIllegalNames(scripts: string[]) {
  return scripts
    .filter((name) => !name.startsWith('_') && !name.endsWith('.d.ts') && !name.endsWith('.js.map'))
    .map((name) => name.replace(/.(t|j)sx?$/, ''))
    .filter((name) => name !== 'index' && !name.endsWith('.worker') && !name.endsWith('.test'))
}
