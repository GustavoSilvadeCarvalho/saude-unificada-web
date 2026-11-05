import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    // O primeiro uso do mongodb-memory-server baixa o binário do MongoDB
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
})
