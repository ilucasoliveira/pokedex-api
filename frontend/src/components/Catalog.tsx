import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router'

import { useDelayedFlag } from '../hooks/useDelayedFlag'
import { PAGE_SIZE, type PokemonFilters } from '../services/pokemonApi'
import { useGenerations, usePokemonList, useTypes } from '../services/queries'
import buttons from '../styles/buttons.module.css'
import { catalogQuery, hasActiveFilters, readCatalogParams } from '../utils/catalogParams'
import { formatCount, formatGeneration, formatType } from '../utils/format'
import { FilterSelect, type FilterOption } from './FilterSelect'
import { Pagination } from './Pagination'
import { PokemonCard, PokemonCardSkeleton } from './PokemonCard'
import { SearchBar } from './SearchBar'
import { ErrorPanel, SlowApiNotice, StatusPanel } from './StatusPanel'
import styles from './Catalog.module.css'

const SKELETON_COUNT = 8

interface CatalogProps {
  title: string
  /** Página inicial usa h2 (o h1 é o hero); a Pokédex usa h1. */
  headingLevel: 'h1' | 'h2'
}

export function Catalog({ title, headingLevel: Heading }: CatalogProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const filters = useMemo(() => readCatalogParams(searchParams), [searchParams])

  const list = usePokemonList(filters)
  const types = useTypes()
  const generations = useGenerations()
  const slow = useDelayedFlag(list.isPending, 4000)

  // Busca e filtros novos sempre voltam para a página 1.
  const updateFilters = useCallback(
    (changes: Partial<PokemonFilters>, replace = false) => {
      const next = { ...readCatalogParams(searchParams), ...changes, page: 1 }
      setSearchParams(new URLSearchParams(catalogQuery(next)), { replace, preventScrollReset: true })
    },
    [searchParams, setSearchParams],
  )

  // Digitar substitui a entrada do histórico, para o Voltar não passar letra por letra.
  const handleSearch = useCallback((search: string) => updateFilters({ search }, true), [updateFilters])

  const typeOptions: FilterOption[] = useMemo(
    () =>
      (types.data ?? [])
        .map((type) => ({ value: type.name, label: `${formatType(type.name)} (${type.count})` }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [types.data],
  )
  const generationOptions: FilterOption[] = useMemo(
    () =>
      (generations.data ?? []).map((generation) => ({
        value: String(generation.id),
        label: `${formatGeneration(generation.id)} (${generation.count})`,
      })),
    [generations.data],
  )

  // Ao trocar de página, leva o foco (e a tela) para o título dos resultados.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousPage = useRef(filters.page)
  useEffect(() => {
    if (previousPage.current !== filters.page) {
      headingRef.current?.focus({ preventScroll: true })
      headingRef.current?.scrollIntoView({ block: 'start' })
    }
    previousPage.current = filters.page
  }, [filters.page])

  const total = list.data?.pagination.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hrefFor = (page: number) => `${location.pathname}${catalogQuery({ ...filters, page })}`
  const clearFilters = () =>
    setSearchParams(new URLSearchParams(), { preventScrollReset: true })

  return (
    <section className={styles.catalog} aria-labelledby="catalogo-titulo">
      <div className={styles.controls}>
        <SearchBar value={filters.search} onSearch={handleSearch} />
        <div className={styles.filters}>
          <FilterSelect
            id="filtro-tipo"
            label="Tipo"
            placeholder="Todos"
            value={filters.type}
            options={typeOptions}
            loading={types.isPending}
            onChange={(type) => updateFilters({ type })}
          />
          <FilterSelect
            id="filtro-geracao"
            label="Geração"
            placeholder="Todas"
            value={filters.generation ? String(filters.generation) : ''}
            options={generationOptions}
            loading={generations.isPending}
            onChange={(generation) => updateFilters({ generation: generation ? Number(generation) : null })}
          />
          {hasActiveFilters(filters) && (
            <button type="button" className={`${buttons.secondary} ${buttons.small} ${styles.clear}`} onClick={clearFilters}>
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      <div className={styles.header}>
        <Heading id="catalogo-titulo" ref={headingRef} tabIndex={-1} className={styles.title}>
          {title}
        </Heading>
        <p className={styles.count} role="status">
          {list.data &&
            (total === 1 ? '1 Pokémon encontrado' : `${formatCount(total)} Pokémon encontrados`)}
        </p>
      </div>

      <SlowApiNotice visible={slow} />

      <div aria-busy={list.isFetching}>
        {list.isPending ? (
          <ul className={styles.grid} aria-label="Carregando Pokémon">
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <li key={index}>
                <PokemonCardSkeleton />
              </li>
            ))}
          </ul>
        ) : list.isError ? (
          <ErrorPanel title="Não foi possível carregar os Pokémon." onRetry={() => list.refetch()} />
        ) : total === 0 ? (
          <StatusPanel
            kind="empty"
            title="Não encontramos esse Pokémon."
            description="Tente outro nome ou número, ou ajuste os filtros."
            action={
              hasActiveFilters(filters) && (
                <button type="button" className={buttons.secondary} onClick={clearFilters}>
                  Limpar filtros
                </button>
              )
            }
          />
        ) : (
          <>
            <ul className={list.isPlaceholderData ? `${styles.grid} ${styles.stale}` : styles.grid}>
              {list.data.data.map((pokemon, index) => (
                <li key={pokemon.id}>
                  <PokemonCard pokemon={pokemon} eager={index < 4} />
                </li>
              ))}
            </ul>
            <Pagination page={filters.page} totalPages={totalPages} hrefFor={hrefFor} />
          </>
        )}
      </div>
    </section>
  )
}
