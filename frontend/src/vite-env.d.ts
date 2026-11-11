/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK: string
  readonly VITE_API_URL: string
  readonly VITE_SHOW_TEST_USERS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
