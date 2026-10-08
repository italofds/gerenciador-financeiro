interface ImportMetaEnv {
  /** Endereço da API de nuvem (pasta `api/`). Sem ela, o app só trabalha com arquivos. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
