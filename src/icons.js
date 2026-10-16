// Kleine Linien-Symbole im 24er-Raster mit 1,6 Strich (wie nojo-ui). Nur Markup, keine Abhängigkeit.
const s = (d, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const I = {
  download: s('<path d="M12 4v11"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M5 19.5h14"/>'),
  external: s('<path d="M14 4h6v6"/><path d="M20 4 10.5 13.5"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  info: s('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".6" fill="currentColor"/>'),
  code: s('<path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/><path d="m13.5 5-3 14"/>'),
  close: s('<path d="m6 6 12 12M18 6 6 18"/>'),
  min: s('<path d="M6 12h12"/>'),
  max: s('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
  restore: s('<rect x="5.5" y="9" width="9.5" height="9.5" rx="2"/><path d="M9 9V7.5a2 2 0 0 1 2-2h5.5a2 2 0 0 1 2 2V13a2 2 0 0 1-2 2H15"/>'),
  folder: s('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
  book: s('<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M5 20.5A2.5 2.5 0 0 0 7.5 23H19v-5"/>'),
  hello: s('<path d="M12 3.5 14 9l5.5 2-5.5 2-2 5.5-2-5.5L4.5 11 10 9z"/>'),
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.5-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5.5h2v13H6zM19 6.2v11.6a.9.9 0 0 1-1.4.8L9.5 13a1.2 1.2 0 0 1 0-2l8.1-5.6a.9.9 0 0 1 1.4.8z"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5.5h2v13h-2zM5 6.2v11.6a.9.9 0 0 0 1.4.8L14.5 13a1.2 1.2 0 0 0 0-2L6.4 5.4A.9.9 0 0 0 5 6.2z"/></svg>',
};
