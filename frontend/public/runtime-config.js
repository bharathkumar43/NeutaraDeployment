// Runtime configuration -- read when the page loads, NOT compiled into the bundle. Vite copies
// public/ verbatim, so this file can be edited on the server after a build: no rebuild, no
// toolchain, no Node.js required.
window.__APP_CONFIG__ = {
  // Hotjar Site ID (digits only). Not a secret: it ships inside client-side JavaScript that any
  // visitor can read. Blank = Hotjar fully off, no script requested, no session recorded.
  hotjarSiteId: "6766434",
};
