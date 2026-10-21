import { RouterProvider } from 'react-router'

import { usePreferences } from './store/preferences'

type Router = Parameters<typeof RouterProvider>[0]['router']

interface AppProps {
  router: Router
}

// Trocar o idioma remonta as páginas (a URL e o cache das consultas continuam),
// para todo texto ser refeito no idioma novo.
export function App({ router }: AppProps) {
  const { language } = usePreferences()
  return <RouterProvider key={language} router={router} />
}
