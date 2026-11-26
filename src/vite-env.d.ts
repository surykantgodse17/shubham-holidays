/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PI_SANDBOX?: string;
  readonly VITE_PI_BRIDGE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
