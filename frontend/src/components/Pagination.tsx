import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'

import { pageItems } from '../utils/pagination'
import styles from './Pagination.module.css'

interface PaginationProps {
  page: number
  totalPages: number
  /** Monta o endereço de uma página mantendo os outros filtros. */
  hrefFor: (page: number) => string
}

export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginação" className={styles.pagination}>
      {page > 1 ? (
        <Link preventScrollReset to={hrefFor(page - 1)} className={styles.arrow} aria-label="Página anterior">
          <ChevronLeft size={20} aria-hidden="true" />
        </Link>
      ) : (
        <span className={`${styles.arrow} ${styles.disabled}`} aria-hidden="true">
          <ChevronLeft size={20} />
        </span>
      )}

      <ol className={styles.pages}>
        {pageItems(page, totalPages).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} className={styles.gap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={item}>
              <Link
                preventScrollReset
                to={hrefFor(item)}
                className={item === page ? `${styles.page} ${styles.current}` : styles.page}
                aria-current={item === page ? 'page' : undefined}
                aria-label={`Página ${item}`}
              >
                {item}
              </Link>
            </li>
          ),
        )}
      </ol>

      {page < totalPages ? (
        <Link preventScrollReset to={hrefFor(page + 1)} className={styles.arrow} aria-label="Próxima página">
          <ChevronRight size={20} aria-hidden="true" />
        </Link>
      ) : (
        <span className={`${styles.arrow} ${styles.disabled}`} aria-hidden="true">
          <ChevronRight size={20} />
        </span>
      )}
    </nav>
  )
}
