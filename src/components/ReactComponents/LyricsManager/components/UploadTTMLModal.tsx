import React, { useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { toast } from "sonner";
import { SpotifyPlayer } from "../../../../components/Global/SpotifyPlayer";
import fetchLyrics, { getSongKey, SessionTTMLStore } from "../../../../utils/Lyrics/fetchLyrics";
import ApplyLyrics, { ApplyLyricsIfCurrent } from "../../../../utils/Lyrics/Global/Applyer";
import { ParseTTML } from "../../../../utils/Lyrics/manager/parseTTML";
import { ProcessLyrics } from "../../../../utils/Lyrics/ProcessLyrics";
import { $currentLyricsData, $ttmlReviewerMode, type TtmlReviewerMode } from "../../../../utils/stores";
import { REVIEWER_MODES, setTtmlReviewerMode, SyncTtmlReviewerForLyrics, SyncTtmlReviewerWithCurrentLyrics } from "../../../../utils/ttmlReviewer.ts";
import { $lastFetchedUri } from "../../../../utils/uiState";
import { LocalLyricsManager } from "../../../../utils/Lyrics/manager";
import { DatabaseIcon, GuideIcon, ResetIcon, UploadIcon } from "./Icons";

type UploadMode = "persistent" | "session" | "temporary";

type UploadTTMLModalProps = {
  onOpenDB: () => void;
  onDone: (mode: UploadMode) => void;
  onShowReviewerDetails: () => void;
};

export default function UploadTTMLModal({ onOpenDB, onDone, onShowReviewerDetails }: UploadTTMLModalProps) {
  const reviewerMode = useStore($ttmlReviewerMode);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingModeRef = useRef<UploadMode>("persistent");

  const songName = SpotifyPlayer.GetName() ?? "Unknown Song";

  function openFilePicker(mode: UploadMode) {
    if (uploading) return;
    pendingModeRef.current = mode;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    void handleUpload(file, pendingModeRef.current);
  }

  function handleOpenGuide() {
    window.open("https://lyrprep.spicylyrics.org/guide", "_blank", "noopener,noreferrer");
  }

  function handleResetTTML() {
    const uri = SpotifyPlayer.GetUri();
    if (!uri) {
      toast.error("No track is currently playing.", { duration: 4000 });
      return;
    }
    const songKey = getSongKey(uri);
    if (songKey) SessionTTMLStore.delete(songKey);
    $lastFetchedUri.set(null);
    $currentLyricsData.set("");
    toast("TTML has been reset.", { duration: 4000 });
    setTimeout(() => {
      fetchLyrics(uri)
        .then((lyrics) => ApplyLyricsIfCurrent(uri, lyrics))
        .catch((err) => {
          toast.error("Error applying lyrics", { duration: 4000 });
          console.error("Error applying lyrics:", err);
        });
    }, 25);
  }

  async function handleUpload(file: File, mode: UploadMode) {
    if (uploading) return;

    if (!file.name.toLowerCase().endsWith(".ttml")) {
      toast.error("Choose a .ttml file.", { duration: 5000 });
      return;
    }

    const uri = SpotifyPlayer.GetUri();
    if (!uri) {
      toast.error("No track is currently playing.", { duration: 5000 });
      return;
    }

    setUploading(true);

    const reader = new FileReader();
    reader.onerror = () => {
      toast.error("Error reading TTML file.", { duration: 5000 });
      setUploading(false);
    };
    reader.onload = async (e) => {
      try {
        const ttml = e.target?.result as string;
        if (SpotifyPlayer.GetUri() !== uri) {
          toast.error("Track changed before TTML finished loading.", { duration: 5000 });
          return;
        }

        const songKey = getSongKey(uri);
        const lyricsId = uri.startsWith("spotify:local:") ? songKey : SpotifyPlayer.GetId();

        if (mode === "persistent") {
          await LocalLyricsManager.put(uri, ttml);
          if (SpotifyPlayer.GetUri() !== uri) {
            toast.error("TTML saved for original track. Current track unchanged.", { duration: 5000 });
            return;
          }
          $lastFetchedUri.set(null);
          $currentLyricsData.set("");
          setTimeout(() => {
            fetchLyrics(uri)
              .then((lyrics) => ApplyLyricsIfCurrent(uri, lyrics))
          }, 25);
          toast.success("TTML saved to Local DB!", { duration: 5000 });
          onDone("persistent");
        } else {
          toast("Found TTML, Parsing...", { duration: 3000 });
          const result = await ParseTTML(ttml);
          if (!result) {
            toast.error("Failed to parse TTML.", { duration: 5000 });
            setUploading(false);
            return;
          }
          const dataToSave = {
            ...result?.Result,
            id: lyricsId,
            uri,
            temporaryUpload: mode === "temporary",
            uploadedTTML: ttml,
            userUploaded: true,
          };
          SyncTtmlReviewerForLyrics(dataToSave, uri);
          await ProcessLyrics(dataToSave);
          if (mode === "session" && songKey) {
            SessionTTMLStore.set(songKey, dataToSave);
          }
          if (SpotifyPlayer.GetUri() !== uri) {
            toast.error("Track changed before TTML could be applied.", { duration: 5000 });
            return;
          }
          $currentLyricsData.set(JSON.stringify(dataToSave));
          await ApplyLyricsIfCurrent(uri, [dataToSave, 200]);
          toast.success(
            mode === "session" ? "Lyrics applied for this session!" : "Lyrics parsed and applied!",
            { duration: 5000 }
          );
          onDone(mode);
        }
      } catch (err) {
        toast.error("Upload failed.", { duration: 5000 });
        console.error("TTML upload error:", err);
        setUploading(false);
      } finally {
        SyncTtmlReviewerWithCurrentLyrics();
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="ll-ldb-upload-root">
      <div className="ll-ldb-upload-header">
        <p className="ll-ldb-upload-subtitle">For: {songName}</p>
        <div className="ll-ldb-upload-actions">
          <button
            type="button"
            className="ll-ldb-database-link"
            onClick={handleOpenGuide}
            disabled={uploading}
          >
            <GuideIcon size={14} />
            <span>Guide</span>
          </button>
          <button
            type="button"
            className="ll-ldb-database-link"
            onClick={handleResetTTML}
            disabled={uploading}
          >
            <ResetIcon size={14} />
            <span>Reset TTML</span>
          </button>
          <button
            type="button"
            className="ll-ldb-database-link"
            onClick={onOpenDB}
            disabled={uploading}
          >
            <DatabaseIcon size={14} />
            <span>TTML Database</span>
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".ttml"
        id="ll-ldb-file-input"
        className="ll-ldb-file-input"
        onChange={handleFileChange}
      />

      <div className="ll-ldb-reviewer">
        <div className="ll-ldb-reviewer-copy">
          <label htmlFor="ll-ldb-reviewer-mode">TTML Reviewer</label>
          <p>Apply a consistent review profile, then restore your settings when it stops.</p>
        </div>
        <div className="ll-ldb-reviewer-actions">
          <button type="button" className="ll-ldb-database-link" onClick={onShowReviewerDetails} disabled={uploading}>What does it change?</button>
          <select id="ll-ldb-reviewer-mode" value={reviewerMode} disabled={uploading} onChange={event => setTtmlReviewerMode(event.currentTarget.value as TtmlReviewerMode)}>
            {REVIEWER_MODES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>

      <div className="ll-ldb-upload-mode-section">
        <button
          type="button"
          className="ll-ldb-upload-mode-card"
          onClick={() => openFilePicker("persistent")}
          disabled={uploading}
        >
          <span className="ll-ldb-upload-mode-icon"><UploadIcon size={16} /></span>
          <span className="ll-ldb-upload-mode-copy">
            <span className="ll-ldb-upload-mode-title">Persistent Load</span>
            <span className="ll-ldb-upload-mode-desc">Stored in local DB, survives restarts</span>
          </span>
        </button>
        <button
          type="button"
          className="ll-ldb-upload-mode-card"
          onClick={() => openFilePicker("temporary")}
          disabled={uploading}
        >
          <span className="ll-ldb-upload-mode-icon"><UploadIcon size={16} /></span>
          <span className="ll-ldb-upload-mode-copy">
            <span className="ll-ldb-upload-mode-title">Temporary Load</span>
            <span className="ll-ldb-upload-mode-desc">Applied only to current song until refresh</span>
          </span>
        </button>
        <button
          type="button"
          className="ll-ldb-upload-mode-card"
          onClick={() => openFilePicker("session")}
          disabled={uploading}
        >
          <span className="ll-ldb-upload-mode-icon"><UploadIcon size={16} /></span>
          <span className="ll-ldb-upload-mode-copy">
            <span className="ll-ldb-upload-mode-title">Session Load</span>
            <span className="ll-ldb-upload-mode-desc">Used for this track until Spotify restarts</span>
          </span>
        </button>
      </div>
    </div>
  );
}
