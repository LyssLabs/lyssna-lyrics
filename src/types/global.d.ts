// Global Types
declare global {
  interface Window {
    _spicy_lyrics_metadata?: any;
    _lyssna_lyrics_metadata?: { LoadedVersion: string; PreviousApp?: "lyssna" | "spicy" | null };
    _spicy_lyrics?: any;
  }
  declare const __SLdev__m: boolean;
  declare const __LYSSNA_BUILD_VERSION__: string;
}


export {};
