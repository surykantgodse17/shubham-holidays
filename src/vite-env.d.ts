/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PI_SANDBOX?: string;
  /** Digits with country code, e.g. 9198XXXXXXXX — used for Book Now on WhatsApp */
  readonly VITE_WHATSAPP_NUMBER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
