import { useSyncExternalStore } from 'react'

/** false quando o aparelho está sem conexão (eventos online/offline do navegador). */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('online', onChange)
      window.addEventListener('offline', onChange)
      return () => {
        window.removeEventListener('online', onChange)
        window.removeEventListener('offline', onChange)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}
