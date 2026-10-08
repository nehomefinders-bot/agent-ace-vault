import { useState } from "react";
import { Play } from "lucide-react";

/** Placeholder tutorial video — pass a different videoId once the real one is live. */
export const DEFAULT_TUTORIAL_VIDEO_ID = "dQw4w9WgXcQ";

type Props = {
  /** YouTube video ID — drop in the live tutorial ID anytime. */
  videoId?: string;
  title?: string;
};

export default function YouTubeEmbed({
  videoId = DEFAULT_TUTORIAL_VIDEO_ID,
  title = "Agent Business Tracker full walkthrough",
}: Props) {
  const [playing, setPlaying] = useState(false);
  const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div className="mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-border shadow-2xl ring-1 ring-[#d4af37]/20">
      {playing ? (
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play ${title}`}
          className="group relative block h-full w-full cursor-pointer bg-slate-950"
        >
          <img
            src={thumb}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span
            className="absolute inset-0 bg-slate-950/50 transition-colors duration-300 group-hover:bg-slate-950/25"
            aria-hidden
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#d4af37] text-slate-950 shadow-[0_16px_44px_-10px_rgba(212,175,55,0.75)] transition-transform duration-300 group-hover:scale-110">
              <Play className="ml-1 h-7 w-7 fill-slate-950" />
            </span>
          </span>
          <span className="absolute bottom-3 left-4 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-white/70">
            Watch the walkthrough
          </span>
        </button>
      )}
    </div>
  );
}
