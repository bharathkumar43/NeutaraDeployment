import { describe, it, expect, beforeEach, vi } from 'vitest';

const SCRIPT_ID = 'hotjar-snippet';

// Re-import the module per case so the module-level site ID is re-read after changing window state.
describe('initHotjar', () => {
  beforeEach(() => {
    vi.resetModules();
    delete window.hj;
    delete window._hjSettings;
    document.getElementById(SCRIPT_ID)?.remove();
  });

  it('does nothing when no site ID is configured', async () => {
    window.__APP_CONFIG__ = { hotjarSiteId: '' };
    const { initHotjar } = await import('./hotjar');
    expect(initHotjar()).toBe(false);
    expect(document.getElementById(SCRIPT_ID)).toBeNull();
  });

  it('injects once and sets a numeric hjid', async () => {
    window.__APP_CONFIG__ = { hotjarSiteId: '6766434' };
    const { initHotjar } = await import('./hotjar');
    expect(initHotjar()).toBe(true);
    expect(window._hjSettings?.hjid).toBe(6766434);
    expect(document.getElementById(SCRIPT_ID)).not.toBeNull();
    expect(initHotjar()).toBe(false); // idempotent — StrictMode must not open two recordings
  });

  it('refuses a non-numeric site ID', async () => {
    window.__APP_CONFIG__ = { hotjarSiteId: 'site-1234' };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { initHotjar } = await import('./hotjar');
    expect(initHotjar()).toBe(false);
    expect(document.getElementById(SCRIPT_ID)).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('treats an unsubstituted __PLACEHOLDER__ as unset', async () => {
    window.__APP_CONFIG__ = { hotjarSiteId: '__HOTJAR_SITE_ID__' };
    const { initHotjar } = await import('./hotjar');
    expect(initHotjar()).toBe(false);
    expect(document.getElementById(SCRIPT_ID)).toBeNull();
  });
});

describe('identifyHotjarUser', () => {
  beforeEach(() => {
    vi.resetModules();
    delete window.hj;
    delete window._hjSettings;
    document.getElementById(SCRIPT_ID)?.remove();
  });

  it('lowercases the email so one person is not two Hotjar users', async () => {
    window.__APP_CONFIG__ = { hotjarSiteId: '6766434' };
    const { initHotjar, identifyHotjarUser } = await import('./hotjar');
    initHotjar();
    const hj = vi.fn();
    window.hj = hj;

    expect(identifyHotjarUser({ email: 'Lavanya.Gopasana@cloudfuze.com', role: 'admin' })).toBe(true);
    expect(hj).toHaveBeenCalledWith('identify', 'lavanya.gopasana@cloudfuze.com', { role: 'admin' });
  });

  it('does nothing without an email', async () => {
    window.__APP_CONFIG__ = { hotjarSiteId: '6766434' };
    const { initHotjar, identifyHotjarUser } = await import('./hotjar');
    initHotjar();
    window.hj = vi.fn();

    expect(identifyHotjarUser(null)).toBe(false);
    expect(identifyHotjarUser({ email: '   ', role: 'dev' })).toBe(false);
  });

  it('does nothing when Hotjar is disabled', async () => {
    window.__APP_CONFIG__ = { hotjarSiteId: '' };
    const { identifyHotjarUser } = await import('./hotjar');
    const hj = vi.fn();
    window.hj = hj;

    expect(identifyHotjarUser({ email: 'dev@cloudfuze.com', role: 'dev' })).toBe(false);
    expect(hj).not.toHaveBeenCalled();
  });
});
