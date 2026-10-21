interface ImportMetaEnv {
  /** Endereço da API. Sem ele, o front usa a API publicada no Render. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
