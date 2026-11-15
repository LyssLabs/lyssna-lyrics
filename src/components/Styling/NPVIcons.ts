// Lucide icons used by Lyssna; see src/assets/LUCIDE_LICENSE.txt.
const svg = (paths: string) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const foldPaths = `<path d="M12 22v-6M12 8V2M4 12H2M10 12H8M16 12h-2M22 12h-2"/>`;
export const NPVIcons = {
  Open: svg(`<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18m5-12 3 3-3 3"/>`),
  Expand: `<span class="LL_IconStack">${svg(`${foldPaths}<path d="m15 19-3 3-3-3m6-14-3-3-3 3"/>`)}${svg(`${foldPaths}<path d="m15 19-3-3-3 3m6-14-3 3-3-3"/>`)}</span>`,
  Toggle: svg(`<path d="m18 15-6-6-6 6"/>`),
};
