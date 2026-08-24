/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AZURE_CLIENT_ID: string;
  readonly VITE_AZURE_TENANT_ID: string;
  /** Hotjar Site ID baked in at image build time. Blank/absent disables Hotjar. */
  readonly VITE_HOTJAR_SITE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Shape of public/runtime-config.js — read at page load, never compiled into the bundle. */
interface AppRuntimeConfig {
  hotjarSiteId?: string;
}

interface Window {
  __APP_CONFIG__?: AppRuntimeConfig;
  /** Hotjar's command queue, installed by the snippet in src/analytics/hotjar.ts. */
  hj?: ((...args: unknown[]) => void) & { q?: unknown[] };
  _hjSettings?: { hjid: number; hjsv: number };
}
