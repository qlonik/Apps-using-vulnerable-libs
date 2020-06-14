module.exports = {
  mode: 'modules',
  includes: './src',
  exclude: ['**/src/**/*test.ts'],

  out: './.build/docs/',
  readme: 'README.md',
  // excludeExternals: true,
  // excludeNotExported: true,
  // excludePrivate: true,
}
