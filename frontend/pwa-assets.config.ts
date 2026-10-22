import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

// Gera os ícones do app (Android, iPhone e favicon) a partir de public/app-icon.svg.
// Rodar de novo só se o ícone mudar: npm run icons
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    // Fundo creme (o mesmo do site) nas versões que não aceitam transparência.
    maskable: { ...preset.maskable, resizeOptions: { background: '#FDF6E9' } },
    apple: { ...preset.apple, resizeOptions: { background: '#FDF6E9' } },
  },
  images: ['public/app-icon.svg'],
})
