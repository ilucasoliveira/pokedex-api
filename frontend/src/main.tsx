// Fontes servidas pelo próprio site (WOFF2, font-display: swap), só os pesos usados.
// Os CSS por peso (400.css) declaram o unicode-range de cada subset, então o
// navegador baixa só o que a página usa (em português e inglês, o latin). Os CSS
// por subset (latin-ext-400.css) não declaram, e todos os arquivos eram baixados.
import '@fontsource-variable/rubik/wght.css'
import '@fontsource/nunito-sans/400.css'
import '@fontsource/nunito-sans/600.css'
import '@fontsource/nunito-sans/700.css'
import '@fontsource/press-start-2p/latin-400.css'
import './styles/tokens.css'
import './styles/global.css'
// Antes do React: o navegador pode avisar que o app é instalável logo ao carregar.
import './store/installPrompt'

import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter } from 'react-router'

import { App } from './App'
import { routes } from './routes'
import { createQueryClient } from './services/queries'

const router = createBrowserRouter(routes)
const queryClient = createQueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
