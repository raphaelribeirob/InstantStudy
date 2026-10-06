/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INSTANTSTUDY_API_URL?: string;
  readonly VITE_INSTANTSTUDY_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
