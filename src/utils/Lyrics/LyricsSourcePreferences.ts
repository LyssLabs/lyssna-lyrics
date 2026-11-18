export type LyricsSourceProviderId =
  | "spicy"
  | "musixmatch"
  | "lrcred"
  | "spotify"
  | "lrclib"
  | "netease";

type LyricsSourceDefinition = {
  label: string;
  description: string;
};

export const DEFAULT_LYRICS_SOURCE_ORDER: LyricsSourceProviderId[] = [
  "spicy",
  "lrcred",
  "musixmatch",
  "spotify",
  "lrclib",
  "netease",
];

export const LYRICS_SOURCE_PROVIDER_DEFINITIONS: Record<
  LyricsSourceProviderId,
  LyricsSourceDefinition
> = {
  spicy: {
    label: "Spicy Lyrics",
    description: "Uses lyrics and credits produced by the official plugin in the background.",
  },
  musixmatch: {
    label: "Musixmatch",
    description:
      "Uses Musixmatch as a fallback and can provide richer synced or word-timed lyrics when available.",
  },
  lrcred: {
    label: "lrc.red",
    description: "Fetch timed lyrics directly from lrc.red, including word sync when available.",
  },
  spotify: {
    label: "Spotify",
    description:
      "Fetches official Spotify lyrics directly as a fallback when available.",
  },
  lrclib: {
    label: "LRCLIB",
    description:
      "Uses lrclib.net for synced or plain lyrics from the open community library.",
  },
  netease: {
    label: "Netease",
    description:
      "Uses Netease community lyrics as an additional synced or plain fallback.",
  },
};

const LYRICS_SOURCE_LABELS: Record<string, string> = {
  spl: "Spicy Lyrics Community",
  spt: "Spotify",
  aml: "Apple Music",
  lrcred: "lrc.red",
  spicy: "Spicy Lyrics",
  spotify: "Spotify",
  lrclib: "LRCLIB",
  netease: "Netease",
  musixmatch: "Musixmatch",
  genius: "Genius",
};

function normalizeProviderIds(value: unknown): LyricsSourceProviderId[] {
  let parsed: unknown = value;

  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value.split(",").map((entry) => entry.trim());
    }
  }

  const validIds = new Set(DEFAULT_LYRICS_SOURCE_ORDER);
  const normalized = Array.isArray(parsed)
    ? parsed.filter(
        (entry): entry is LyricsSourceProviderId =>
          typeof entry === "string" && validIds.has(entry as LyricsSourceProviderId)
      )
    : [];

  return Array.from(new Set(normalized));
}

export function normalizeLyricsSourceOrder(
  value: unknown
): LyricsSourceProviderId[] {
  const deduped = normalizeProviderIds(value);

  DEFAULT_LYRICS_SOURCE_ORDER.forEach((id) => {
    if (!deduped.includes(id)) {
      deduped.push(id);
    }
  });

  return deduped;
}

export function stringifyLyricsSourceOrder(
  order: LyricsSourceProviderId[]
): string {
  return JSON.stringify(normalizeLyricsSourceOrder(order));
}

export function normalizeDisabledLyricsSourceIds(
  value: unknown
): LyricsSourceProviderId[] {
  return normalizeProviderIds(value);
}

export function stringifyDisabledLyricsSourceIds(
  ids: LyricsSourceProviderId[]
): string {
  return JSON.stringify(normalizeDisabledLyricsSourceIds(ids));
}

export function resolveLyricsSourceLabel(
  source?: string,
  sourceDisplayName?: string,
  fetchProvider?: string
): string | null {
  if (sourceDisplayName?.trim()) {
    return sourceDisplayName.trim();
  }

  if (source && LYRICS_SOURCE_LABELS[source]) {
    return LYRICS_SOURCE_LABELS[source];
  }

  if (fetchProvider && LYRICS_SOURCE_LABELS[fetchProvider]) {
    return LYRICS_SOURCE_LABELS[fetchProvider];
  }

  if (source?.trim()) {
    return source.trim();
  }

  return null;
}
