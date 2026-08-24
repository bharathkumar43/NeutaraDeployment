/**
 * Resolves configuration that must stay changeable after the bundle is built.
 *
 * Vite freezes `import.meta.env` values into the built JavaScript, so a bundle built with tracking
 * on can never be un-tracked without a rebuild, and one built without an ID can never be turned on.
 * Reading `window.__APP_CONFIG__` first (populated by public/runtime-config.js, which Vite copies
 * verbatim) makes the value editable on the server; the build-time value is the fallback.
 */
const runtime: AppRuntimeConfig = typeof window !== 'undefined' && window.__APP_CONFIG__ ? window.__APP_CONFIG__ : {};

/**
 * Treated as "not set": undefined, null, blank, and the `__PLACEHOLDER__` shape container
 * entrypoints substitute at start-up — an unsubstituted placeholder must fall through, not be used.
 */
function isUnset(value: unknown): boolean {
  if (typeof value !== 'string') return true;
  const trimmed = value.trim();
  return !trimmed || /^__.*__$/.test(trimmed);
}

function resolve(runtimeValue: unknown, buildTimeValue: unknown): string {
  for (const raw of [runtimeValue, buildTimeValue]) {
    if (!isUnset(raw)) return (raw as string).trim();
  }
  return '';
}

export const HOTJAR_SITE_ID: string = resolve(
  runtime.hotjarSiteId,
  import.meta.env.VITE_HOTJAR_SITE_ID,
);
