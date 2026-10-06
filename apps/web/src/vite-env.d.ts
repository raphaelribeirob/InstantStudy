/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INSTANTSTUDY_API_URL?: string;
  readonly VITE_INSTANTSTUDY_API_KEY?: string;
  readonly VITE_INSTANTSTUDY_MCP_URL?: string;
  readonly VITE_INSTANTSTUDY_OPENAPI_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
