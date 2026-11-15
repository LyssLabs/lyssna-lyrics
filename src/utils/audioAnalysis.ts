import type { AudioAnalysisData } from "../components/DynamicBG/BackgroundAnimationController";
import { GetExpireStore } from "../modules/Store";
import { getRemoteConfig } from "./remoteConfig";
import { SpotifyFetch } from "../components/Global/SpotifyFetch.ts";

interface CachedAudioAnalysis {
    analysis?: AudioAnalysisData;
    /**
     * Written by older builds for a 404; no longer read, since it pinned the miss
     * for the whole analysis TTL. 404s now go to AudioAnalysisNotFoundStore.
     */
    notFound?: boolean;
}

function getHttpErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== "object") {
        return undefined;
    }
    const e = error as { status?: unknown; code?: unknown };
    if (typeof e.status === "number") {
        return e.status;
    }
    if (typeof e.code === "number") {
        return e.code;
    }
    return undefined;
}

// A getter so a pushed TTL applies to every write from then on.
export const AudioAnalysisStore = GetExpireStore<CachedAudioAnalysis>("LyssnaLyrics_AudioAnalysis", 1, {
    get Duration() {
        return getRemoteConfig().cache.audioAnalysisTtlMonths;
    },
    Unit: "Months"
});

// Spotify's 404 here isn't always permanent, so a miss is only trusted for a
// short while (`cache.audioAnalysisNotFoundTtlHours`) before asking again.
const AudioAnalysisNotFoundStore = GetExpireStore<true>("LyssnaLyrics_AudioAnalysisNotFound", 1, {
    get Duration() {
        return getRemoteConfig().cache.audioAnalysisNotFoundTtlHours;
    },
    Unit: "Hours"
});

const pendingAnalysis = new Map<string, Promise<AudioAnalysisData | null>>();

function isOrderedIntervals(value: unknown): boolean {
    if (!Array.isArray(value)) return false;
    let previousStart = -Infinity;
    let previousEnd = -Infinity;
    return value.every(interval => {
        if (!interval || !Number.isFinite(interval.start) || !Number.isFinite(interval.duration) || interval.duration < 0) return false;
        const end = interval.start + interval.duration;
        if (!Number.isFinite(end) || interval.start < previousStart || end < previousEnd) return false;
        previousStart = interval.start;
        previousEnd = end;
        return true;
    });
}

function isAudioAnalysisData(data: unknown): data is AudioAnalysisData {
    if (!data || typeof data !== "object") {
        return false;
    }

    const parsed = data as Partial<AudioAnalysisData>;
    return !!parsed.track && Number.isFinite(parsed.track.duration) && parsed.track.duration > 0 &&
        Array.isArray(parsed.sections) && isOrderedIntervals(parsed.beats) && isOrderedIntervals(parsed.segments);
}

function isSpotifyTrackId(trackId: string): boolean {
    return /^[A-Za-z0-9]{22}$/.test(trackId);
}

/**
 * Gets and validates audio analysis for a Spotify track URI or bare track ID.
 * @returns The parsed AudioAnalysisData, or null if the fetch fails
 */
export async function getDynamicAudioAnalysis(uri: string): Promise<AudioAnalysisData | null> {
    if (!uri) {
        return null;
    }

    // Local tracks aren't hosted by Spotify, so there's no audio analysis to
    // load for them — skip the request entirely.
    if (uri.startsWith("spotify:local:")) {
        return null;
    }

    const trackId = uri.startsWith("spotify:track:") ? uri.slice("spotify:track:".length) : uri;
    if (!isSpotifyTrackId(trackId)) {
        return null;
    }

    const pending = pendingAnalysis.get(trackId);
    if (pending) return pending;
    const request = loadAudioAnalysis(trackId).finally(() => pendingAnalysis.delete(trackId));
    pendingAnalysis.set(trackId, request);
    return request;
}

async function loadAudioAnalysis(trackId: string): Promise<AudioAnalysisData | null> {
    try {
        if (await AudioAnalysisNotFoundStore.GetItem(trackId)) {
            return null;
        }
        const cached = await AudioAnalysisStore.GetItem(trackId);
        if (cached?.analysis && isAudioAnalysisData(cached.analysis)) {
            return cached.analysis;
        }

        const url = `https://spclient.wg.spotify.com/audio-attributes/v1/audio-analysis/${trackId}?format=json`;
        // Shared by lyrics, static scrolling, and backgrounds; keep the request bounded.
        const res = await SpotifyFetch(url, { signal: AbortSignal.timeout(getRemoteConfig().audioAnalysis.timeoutMs) });
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
        const data = await res.json() as unknown;
        if (!isAudioAnalysisData(data)) {
            throw new Error("Invalid audio analysis duration or interval arrays.");
        }

        await AudioAnalysisStore.SetItem(trackId, {
            analysis: data,
        });

        return data;
    } catch (error: unknown) {
        const httpStatus = getHttpErrorStatus(error);
        const message = error && typeof error === "object" && "message" in error
            ? String((error as { message?: unknown }).message)
            : undefined;

        if (httpStatus === 404) {
            console.error("Analysis not found (404)");
            await AudioAnalysisNotFoundStore.SetItem(trackId, true).catch(() => {});
        } else if (httpStatus === 429) {
            console.error("Rate limited (429)");
        } else {
            console.error("Network or Validation Error:", message || error);
        }
        return null;
    }
}
