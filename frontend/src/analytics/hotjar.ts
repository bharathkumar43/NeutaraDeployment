import { HOTJAR_SITE_ID } from '../config/runtimeConfig';
import { User } from '../types';

const SCRIPT_ID = 'hotjar-snippet';

// Snippet version Hotjar expects in both _hjSettings and the script URL. Bumping this is Hotjar's
// call, not ours — it changes only when they ship a new loader contract.
const SNIPPET_VERSION = 6;

export function isHotjarEnabled(): boolean {
  return Boolean(HOTJAR_SITE_ID);
}

/**
 * Injects the Hotjar snippet. No-ops when no site ID is configured, which is the normal state in
 * local development and on any deploy that has not opted in.
 *
 * Idempotent on purpose: React.StrictMode double-invokes effects in development, and two copies of
 * the snippet would open two recordings for one page view.
 *
 * @returns true only when this call actually injected the script.
 */
export function initHotjar(): boolean {
  if (!isHotjarEnabled()) return false;
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (document.getElementById(SCRIPT_ID)) return false;

  // A non-numeric ID would silently request hotjar-NaN.js and fail with nothing in the console
  // pointing at the cause. Say so instead — a typo'd ID and a deliberately disabled Hotjar should
  // not look identical to whoever is debugging. This is a misconfiguration diagnostic, not a debug
  // log, so it stays in committed code.
  if (!/^\d+$/.test(HOTJAR_SITE_ID)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[analytics] Ignoring hotjarSiteId="${HOTJAR_SITE_ID}": a Hotjar Site ID is digits only ` +
        `(e.g. "3847291"). Find it under Settings → Sites & Organizations in Hotjar. Recording is off.`,
    );
    return false;
  }

  // The queue has to exist before the remote script loads, so calls made during the first render —
  // identify, in particular — are replayed instead of dropped on the floor.
  window.hj =
    window.hj ||
    function hotjarQueue(...args: unknown[]): void {
      (window.hj!.q = window.hj!.q || []).push(args);
    };
  // Number, not string: Hotjar's own snippet emits `hjid:6763513` as a numeric literal and the
  // remote script reads this value back. The digits-only guard above means Number() cannot NaN here.
  window._hjSettings = { hjid: Number(HOTJAR_SITE_ID), hjsv: SNIPPET_VERSION };

  const script = document.createElement('script');
  script.id = SCRIPT_ID;
  script.async = true;
  script.src = `https://static.hotjar.com/c/hotjar-${HOTJAR_SITE_ID}.js?sv=${SNIPPET_VERSION}`;
  document.head.appendChild(script);
  return true;
}

/**
 * Tags the current recording with who is using the app, so recordings can be filtered per person.
 *
 * Email is the right identifier here: every user is an internal CloudFuze employee arriving through
 * single-tenant Azure AD or an admin-created account, so there are no customer or public users whose
 * address would be handed to Hotjar.
 *
 * Note: filtering by these attributes is a paid Hotjar feature. On a tier without it the call is
 * accepted and ignored, so this stays safe to ship regardless of plan.
 *
 * @returns true only when an identify call was actually sent.
 */
export function identifyHotjarUser(user: Pick<User, 'email' | 'role'> | null | undefined): boolean {
  if (!isHotjarEnabled()) return false;
  if (typeof window === 'undefined' || typeof window.hj !== 'function') return false;

  // Lowercased to match the case-insensitive email rule the backend follows. Without it, one person
  // signing in as Lavanya.Gopasana@ and lavanya.gopasana@ appears as two different Hotjar users.
  const email = (user?.email || '').trim().toLowerCase();
  if (!email) return false;

  window.hj('identify', email, { role: user?.role || 'UNKNOWN' });
  return true;
}
