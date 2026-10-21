import type { RouteObject } from 'react-router'

import { Layout } from './components/Layout'
import { AboutPage } from './pages/AboutPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { GenerationsPage } from './pages/GenerationsPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PokedexPage } from './pages/PokedexPage'
import { PokemonPage } from './pages/PokemonPage'
import { TypesPage } from './pages/TypesPage'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/pokedex', element: <PokedexPage /> },
      { path: '/pokemon/:idOrName', element: <PokemonPage /> },
      { path: '/tipos', element: <TypesPage /> },
      { path: '/geracoes', element: <GenerationsPage /> },
      { path: '/favoritos', element: <FavoritesPage /> },
      { path: '/sobre', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
