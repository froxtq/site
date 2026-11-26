"use client";

import { Pause, Play, Plus, SkipBack, SkipForward, Trash2, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { THEME } from "@/data/portfolio-data";
import { songs } from "@/data/songs";

type CustomTrack = { title: string; artist: string; url: string };
const CUSTOM_TRACKS_KEY = "froxtq-custom-tracks";

export function MusicPlayer() {
  const [customTracks, setCustomTracks] = useState<CustomTrack[]>([]);
  const [adminOpen, setAdminOpen] = useState(false);
  const [form, setForm] = useState<CustomTrack>({ title: "", artist: "", url: "" });
  const tracks = useMemo(() => [...songs, ...customTracks], [customTracks]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const volumeBeforeMuteRef = useRef(0.85);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const syncSrcRef = useRef(false);

  const currentTrack = useMemo(() => tracks[trackIndex], [tracks, trackIndex]);
  const hasTracks = tracks.length > 0 && Boolean(currentTrack?.url?.trim());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_TRACKS_KEY);
      if (saved) setCustomTracks(JSON.parse(saved) as CustomTrack[]);
    } catch {
      localStorage.removeItem(CUSTOM_TRACKS_KEY);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        setAdminOpen((open) => !open);
      }
      if (event.key === "Escape") setAdminOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const saveCustomTracks = (next: CustomTrack[]) => {
    setCustomTracks(next);
    localStorage.setItem(CUSTOM_TRACKS_KEY, JSON.stringify(next));
  };

  const addTrack = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = [...customTracks, { ...form, title: form.title.trim(), artist: form.artist.trim(), url: form.url.trim() }];
    saveCustomTracks(next);
    setTrackIndex(tracks.length);
    setForm({ title: "", artist: "", url: "" });
  };

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const goNext = useCallback(() => {
    if (!tracks.length) return;
    setTrackIndex((prev) => {
      if (tracks.length <= 1) {
        queueMicrotask(() => {
          const el = audioRef.current;
          if (!el) return;
          el.currentTime = 0;
          void el.play().catch(() => setIsPlaying(false));
        });
        return prev;
      }
      return (prev + 1) % tracks.length;
    });
  }, [tracks.length]);

  const goPrev = useCallback(() => {
    if (!tracks.length) return;
    setTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  }, [tracks.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.url) return;
    syncSrcRef.current = true;
    audio.src = currentTrack.url;
    audio.load();
    if (isPlayingRef.current) {
      void audio.play().catch(() => setIsPlaying(false));
    }
    const id = window.setTimeout(() => {
      syncSrcRef.current = false;
    }, 0);
    return () => window.clearTimeout(id);
  }, [trackIndex, currentTrack?.url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.muted = muted;
  }, [volume, muted]);

  const handleAudioPlay = () => setIsPlaying(true);

  const handleAudioPause = () => {
    if (syncSrcRef.current) return;
    const audio = audioRef.current;
    if (!audio) return;
    const atEnd =
      audio.ended || (Number.isFinite(audio.duration) && audio.duration > 0 && audio.currentTime >= audio.duration - 0.25);
    if (atEnd) return;
    setIsPlaying(false);
  };

  const toggleMute = () => {
    if (!muted) {
      volumeBeforeMuteRef.current = volume > 0 ? volume : volumeBeforeMuteRef.current;
      setMuted(true);
      return;
    }
    setVolume(volumeBeforeMuteRef.current > 0 ? volumeBeforeMuteRef.current : 0.5);
    setMuted(false);
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.url) return;

    if (!audio.paused) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const handleVolumeSlider = (value: number) => {
    const v = Math.max(0, Math.min(1, value));
    setVolume(v);
    if (v > 0 && muted) setMuted(false);
    if (v > 0) volumeBeforeMuteRef.current = v;
  };

  const handleEnded = () => {
    goNext();
  };

  if (!hasTracks) {
    return null;
  }

  const trackLabel = `${currentTrack.artist} - ${currentTrack.title}`;

  return (
    <div
      data-snow-surface="music-player"
      className="player-anchor glass-surface flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/20 px-3 py-2 text-center sm:gap-3"
      style={{
        borderColor: THEME.border
      }}
    >
      <button
        type="button"
        onClick={() => goPrev()}
        className="glass-control rounded-xl border p-2 transition hover:opacity-85"
        style={{ borderColor: THEME.border }}
        aria-label="Previous track"
      >
        <SkipBack size={16} />
      </button>

      <button
        type="button"
        onClick={() => void togglePlay()}
        className="glass-control rounded-xl border p-2 transition hover:opacity-85"
        style={{ borderColor: THEME.border }}
        aria-label={isPlaying ? "Pause music" : "Play music"}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>

      <button
        type="button"
        onClick={() => goNext()}
        className="glass-control rounded-xl border p-2 transition hover:opacity-85"
        style={{ borderColor: THEME.border }}
        aria-label="Next track"
      >
        <SkipForward size={16} />
      </button>

      <div className="min-w-0 max-w-[200px] flex-1 sm:max-w-[260px]">
        <p className="truncate text-xs text-[var(--text)]" title={trackLabel}>
          {trackLabel}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleMute}
          className="glass-control rounded-xl border p-2 transition hover:opacity-85"
          style={{ borderColor: THEME.border }}
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => handleVolumeSlider(Number(e.target.value) / 100)}
          aria-label="Volume"
          className="glass-range h-1 w-24 cursor-pointer sm:w-28"
          style={{ accentColor: THEME.accent }}
        />
      </div>

      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={handleAudioPlay}
        onPause={handleAudioPause}
        onEnded={handleEnded}
      />

      {adminOpen && (
        <section className="glass-surface fixed bottom-20 left-4 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/20 p-4 text-left text-sm" aria-label="Music manager">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Add Music</h2>
            <button type="button" onClick={() => setAdminOpen(false)} className="glass-control rounded-lg p-1" aria-label="Close music manager"><X size={18} /></button>
          </div>
          <form onSubmit={addTrack} className="space-y-2">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Track title" className="glass-control w-full rounded-xl border border-white/15 px-3 py-2 outline-none focus:border-white/40" />
            <input required value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} placeholder="Artist" className="glass-control w-full rounded-xl border border-white/15 px-3 py-2 outline-none focus:border-white/40" />
            <input required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="Audio URL (MP3)" className="glass-control w-full rounded-xl border border-white/15 px-3 py-2 outline-none focus:border-white/40" />
            <button className="glass-control flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 px-3 py-2 transition hover:bg-white/20"><Plus size={16} /> Add Track</button>
          </form>
          {customTracks.length > 0 && <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto border-t border-white/10 pt-2">
            {customTracks.map((track, index) => <li key={`${track.url}-${index}`} className="flex items-center justify-between gap-2 text-xs text-white/75"><span className="truncate">{track.artist} — {track.title}</span><button type="button" onClick={() => { saveCustomTracks(customTracks.filter((_, i) => i !== index)); setTrackIndex((current) => Math.min(current, Math.max(0, tracks.length - 2))); }} aria-label={`Remove ${track.title}`} className="glass-control shrink-0 rounded-lg p-1 hover:text-red-300"><Trash2 size={14} /></button></li>)}
          </ul>}
          <p className="mt-3 text-[10px] leading-relaxed text-white/50">Open this panel with Ctrl+Shift+M. Tracks are saved in this browser only.</p>
        </section>
      )}
    </div>
  );
}
