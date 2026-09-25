import { defineConfig } from 'vitest/config';

// Configuração só dos testes (as dependências de teste não são necessárias para publicar).
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
