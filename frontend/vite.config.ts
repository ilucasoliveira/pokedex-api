/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Mesmo padrão de src/services/pokemonApi.ts: sem VITE_API_URL, a API publicada.
const DEFAULT_API_URL = 'https://pokedex-api-cb8d.onrender.com'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const apiOrigin = new URL(loadEnv(mode, process.cwd()).VITE_API_URL || DEFAULT_API_URL).origin
  // Expressão regular, e não função: o Workbox copia a função como texto para o
  // sw.js, onde as variáveis deste arquivo não existem.
  const apiPattern = new RegExp(`^${apiOrigin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`)

  return {
    plugins: [
      react(),
      // O site vira um app instalável (PWA) no Android e no iPhone: ícone na tela
      // inicial, tela cheia e funcionamento offline do que já foi visto.
      VitePWA({
        // Cada deploy publica um service worker novo, que entra sozinho na próxima visita.
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'Rota151 · Pokédex',
          short_name: 'Rota151',
          description:
            'Atlas interativo do universo Pokémon: busque, filtre e descubra atributos, habilidades e evoluções.',
          lang: 'pt-BR',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#FDF6E9',
          theme_color: '#FDF6E9',
          categories: ['entertainment', 'education'],
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          // Atalhos ao segurar o ícone do app (Android e desktop).
          shortcuts: [
            { name: 'Pokédex', url: '/pokedex', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
            { name: 'Favoritos', url: '/favoritos', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          ],
        },
        workbox: {
          // O "esqueleto" do site fica no aparelho: abre na hora, inclusive offline.
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          // Fontes só nos alfabetos latinos (os outros subsets nunca são usados aqui).
          globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese,hebrew,arabic}-*'],
          // SPA: qualquer endereço do site abre o index.html, e o React Router resolve.
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              // Dados da API: rede primeiro (sempre atualizados); sem rede, o último visto.
              urlPattern: apiPattern,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'rota151-api',
                networkTimeoutSeconds: 8,
                expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 14 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Sprites, artes e pedras da PokéAPI não mudam: do aparelho, quando já baixados.
              urlPattern: ({ url }) =>
                url.origin === 'https://raw.githubusercontent.com' && url.pathname.startsWith('/PokeAPI/sprites/'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'rota151-imagens',
                expiration: { maxEntries: 2500, maxAgeSeconds: 60 * 60 * 24 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      // Classes dos CSS Modules com o nome original, para os testes poderem consultá-las.
      css: { modules: { classNameStrategy: 'non-scoped' } },
    },
  }
})
