import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    root: './',
    // *.e2e-spec.ts sobem a API com banco; *.spec.ts são unitários
    include: ['test/**/*.e2e-spec.ts', 'test/**/*.spec.ts'],
    // O primeiro uso do mongodb-memory-server baixa o binário do MongoDB
    hookTimeout: 120_000,
    testTimeout: 30_000,
    // Relatório de cobertura (npm run test:cov): vai para coverage/ e entra nas evidências de Qualidade
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Pontos de entrada que só sobem o servidor ou geram arquivos (não são lógica da API)
      exclude: ['src/main.ts', 'src/dev-memory.ts', 'src/openapi.ts'],
      reporter: ['text-summary', 'html', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      // Mínimo exigido no CI: se a cobertura cair abaixo disso, o pipeline falha
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 80 },
    },
  },
})
