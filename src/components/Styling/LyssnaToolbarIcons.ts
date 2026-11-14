// Lyssna's toolbar glyphs use Lucide geometry; see src/assets/LUCIDE_LICENSE.txt.
const icon = (name: string, paths: string) => `<svg class="NoFill toolbar-icon toolbar-icon-${name}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const LyssnaToolbarIcons = {
  translate: icon("translate", '<g class="part-symbol"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/></g><g class="part-latin"><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></g>'),
  wordSync: icon("word-sync", ["M2 10v3", "M6 6v11", "M10 3v18", "M14 8v7", "M18 5v13", "M22 10v3"].map((d, i) => `<path d="${d}" class="part-bar part-bar-${i}"/>`).join("")),
  compact: icon("compact", '<rect width="18" height="18" x="3" y="3" rx="2" class="part-frame"/><path d="M21 9H3" class="part-row-top"/><path d="M21 15H3" class="part-row-bottom"/>'),
  artwork: icon("hide-artwork", '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18" class="part-divider"/><path d="m16 15-3-3 3-3" class="part-chevron"/>'),
  swap: icon("swap", '<g class="part-left"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/></g><g class="part-right"><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></g>'),
  upload: icon("upload", '<g class="part-arrow"><path d="M12 3v12"/><path d="m17 8-5-5-5 5"/></g><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'),
  retry: icon("retry", '<g class="part-spinner"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></g>'),
  fullscreen: icon("fullscreen", '<g class="part-corner-out"><path d="M15 3h6v6"/><path d="m21 3-7 7"/></g><g class="part-corner-in"><path d="m3 21 7-7"/><path d="M9 21H3v-6"/></g>'),
};
