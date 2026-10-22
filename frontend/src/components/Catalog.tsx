import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router'

import { useDelayedFlag } from '../hooks/useDelayedFlag'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { PAGE_SIZE, SORT_KEYS, type PokemonFilters, type SortKey } from '../services/pokemonApi'
import { useGenerations, usePokemonList, useTypes } from '../services/queries'
import buttons from '../styles/buttons.module.css'
import { catalogQuery, correctFilters, hasActiveFilters, readCatalogParams } from '../utils/catalogParams'
import { t } from '../i18n'
import { formatCount, formatGeneration, formatSort, formatType, sortedStat } from '../utils/format'
import { DetailPanel } from './DetailPanel'
import { FilterSelect, type FilterOption } from './FilterSelect'
import { Pagination } from './Pagination'
import { PokemonCard, PokemonCardSkeleton } from './PokemonCard'
import { SearchBar } from './SearchBar'
import { ErrorPanel, SlowApiNotice, StatusPanel } from './StatusPanel'
import styles from './Catalog.module.css'

const SKELETON_COUNT = 8

// O painel lateral aparece a partir daqui; abaixo, o card abre a página do Pokémon.
const PANEL_QUERY = '(min-width: 1280px)'

interface CatalogProps {
  title: string
  /** Página inicial usa h2 (o h1 é o hero); a Pokédex usa h1. */
  headingLevel: 'h1' | 'h2'
}

export function Catalog({ title, headingLevel: Heading }: CatalogProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const filters = useMemo(() => readCatalogParams(searchParams), [searchParams])
  const hasPanelSpace = useMediaQuery(PANEL_QUERY)
  const selectedParam = Number(searchParams.get('selected'))
  const selected = hasPanelSpace && Number.isInteger(selectedParam) && selectedParam > 0 ? selectedParam : null

  const list = usePokemonList(filters)
  const types = useTypes()
  const generations = useGenerations()
  const slow = useDelayedFlag(list.isPending, 4000)

  // Busca, filtros e ordenação novos sempre voltam para a página 1 (e fecham o painel).
  const updateFilters = useCallback(
    (changes: Partial<PokemonFilters>, replace = false) => {
      const next = { ...readCatalogParams(searchParams), ...changes, page: 1 }
      setSearchParams(new URLSearchParams(catalogQuery(next)), { replace, preventScrollReset: true })
    },
    [searchParams, setSearchParams],
  )

  // Digitar substitui a entrada do histórico, para o Voltar não passar letra por letra.
  const handleSearch = useCallback((search: string) => updateFilters({ search }, true), [updateFilters])

  // O Pokémon do painel fica na URL (?selected=25): o Voltar fecha o painel.
  const panelQuery = useCallback(
    (id: number | null) => {
      const params = new URLSearchParams(searchParams)
      if (id) params.set('selected', String(id))
      else params.delete('selected')
      return params
    },
    [searchParams],
  )
  const selectPokemon = useCallback(
    (id: number) => setSearchParams(panelQuery(id), { preventScrollReset: true }),
    [panelQuery, setSearchParams],
  )
  const closePanel = useCallback(
    () => setSearchParams(panelQuery(null), { preventScrollReset: true }),
    [panelQuery, setSearchParams],
  )

  const sortOptions: FilterOption[] = SORT_KEYS.map((key) => ({ value: key, label: formatSort(key) }))
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

  // Filtro ou página que não existe: corrige a URL, sem criar entrada no histórico.
  const correction = correctFilters(filters, {
    totalPages: list.data && !list.isPlaceholderData ? totalPages : null,
    types: types.data?.map((type) => type.name) ?? null,
    generations: generations.data?.map((generation) => generation.id) ?? null,
  })
  const correctedQuery = correction ? catalogQuery(correction) : null
  useEffect(() => {
    if (correctedQuery !== null) {
      setSearchParams(new URLSearchParams(correctedQuery), { replace: true, preventScrollReset: true })
    }
  }, [correctedQuery, setSearchParams])
  const pageIds = list.data?.data.map((pokemon) => pokemon.id) ?? []
  const highlightStat = sortedStat(filters.sort)
  const hrefFor = (page: number) => `${location.pathname}${catalogQuery({ ...filters, page })}`
  const clearFilters = () =>
    setSearchParams(new URLSearchParams(catalogQuery({ ...filters, search: '', type: '', generation: null, page: 1 })), {
      preventScrollReset: true,
    })

  return (
    <section className={styles.catalog} aria-labelledby="catalogo-titulo">
      <div className={styles.controls}>
        <SearchBar value={filters.search} onSearch={handleSearch} />
        <div className={styles.filters}>
          <FilterSelect
            id="filtro-tipo"
            label={t('filter.type')}
            placeholder={t('filter.allTypes')}
            value={filters.type}
            options={typeOptions}
            loading={types.isPending}
            onChange={(type) => updateFilters({ type })}
          />
          <FilterSelect
            id="filtro-geracao"
            label={t('filter.generation')}
            placeholder={t('filter.allGenerations')}
            value={filters.generation ? String(filters.generation) : ''}
            options={generationOptions}
            loading={generations.isPending}
            onChange={(generation) => updateFilters({ generation: generation ? Number(generation) : null })}
          />
          <FilterSelect
            id="ordenar"
            label={t('filter.sort')}
            value={filters.sort}
            options={sortOptions}
            onChange={(sort) => updateFilters({ sort: sort as SortKey })}
          />
          {hasActiveFilters(filters) && (
            <button type="button" className={`${buttons.secondary} ${buttons.small} ${styles.clear}`} onClick={clearFilters}>
              {t('filter.clear')}
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
            (total === 1 ? t('catalog.countOne') : t('catalog.countOther', { count: formatCount(total) }))}
        </p>
      </div>

      <SlowApiNotice visible={slow} />

      <div className={selected ? `${styles.results} ${styles.withPanel}` : styles.results}>
        <div aria-busy={list.isFetching}>
          {list.isPending ? (
            <ul className={styles.grid} aria-label={t('catalog.loading')}>
              {/* Chave própria: com o índice (0 a 7), o React reaproveitava esses <li> para
                  os cards de chave 1 a 7, que pulavam de coluna ao carregar (CLS 0,14). */}
              {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                <li key={`esqueleto-${index}`}>
                  <PokemonCardSkeleton />
                </li>
              ))}
            </ul>
          ) : list.isError ? (
            <ErrorPanel title={t('catalog.error')} onRetry={() => list.refetch()} />
          ) : total === 0 ? (
            <StatusPanel
              kind="empty"
              title={t('catalog.emptyTitle')}
              description={t('catalog.emptyDescription')}
              action={
                hasActiveFilters(filters) && (
                  <button type="button" className={buttons.secondary} onClick={clearFilters}>
                    {t('filter.clear')}
                  </button>
                )
              }
            />
          ) : (
            <>
              <ul className={list.isPlaceholderData ? `${styles.grid} ${styles.stale}` : styles.grid}>
                {list.data.data.map((pokemon, index) => (
                  <li key={pokemon.id}>
                    <PokemonCard
                      pokemon={pokemon}
                      eager={index < 4}
                      highlightStat={highlightStat}
                      onSelect={hasPanelSpace ? selectPokemon : undefined}
                      selected={pokemon.id === selected}
                      headingLevel={Heading === 'h1' ? 'h2' : 'h3'}
                    />
                  </li>
                ))}
              </ul>
              <Pagination page={filters.page} totalPages={totalPages} hrefFor={hrefFor} />
            </>
          )}
        </div>

        {selected && (
          <DetailPanel
            key="painel"
            id={selected}
            pageIds={pageIds}
            onSelect={selectPokemon}
            onClose={closePanel}
            hrefFor={(id) => `?${panelQuery(id)}`}
            from={`${location.pathname}${location.search}`}
          />
        )}
      </div>
    </section>
  )
}
