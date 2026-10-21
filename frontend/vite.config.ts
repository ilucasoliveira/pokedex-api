/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Classes dos CSS Modules com o nome original, para os testes poderem consultá-las.
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
