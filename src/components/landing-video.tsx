import { useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";

const YT_ID = "g-FDTVZ-InI";
const THUMB = `https://i.ytimg.com/vi/${YT_ID}/hqdefault.jpg`;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function LandingVideo({ open, onOpenChange }: Props) {
  const [showTeaser, setShowTeaser] = useState(true);
  const [teaserMounted, setTeaserMounted] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Start the 8s dismiss timer only AFTER the teaser has actually mounted.
  useEffect(() => {
    if (!showTeaser || !teaserMounted) return;
    const t = setTimeout(() => setShowTeaser(false), 8000);
    return () => clearTimeout(t);
  }, [showTeaser, teaserMounted]);

  useEffect(() => {
    setTeaserMounted(true);
  }, []);

  const closeVideo = () => {
    const f = iframeRef.current;
    if (f) {
      try {
        f.contentWindow?.postMessage(
          '{"event":"command","func":"stopVideo","args":""}',
          "*",
        );
      } catch {}
      f.src = "about:blank";
    }
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeVideo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      {showTeaser && (
        <div className="fixed bottom-6 right-6 z-40 w-72 animate-in slide-in-from-right-8 fade-in duration-500">
          <button
            type="button"
            onClick={() => {
              setShowTeaser(false);
              onOpenChange(true);
            }}
            className="group relative block w-full overflow-hidden rounded-xl border border-white/15 bg-slate-950/90 text-left shadow-2xl ring-1 ring-[#d4af37]/30 backdrop-blur-md transition hover:ring-[#d4af37]/70"
          >
            <span
              onClick={(e) => {
                e.stopPropagation();
                setShowTeaser(false);
              }}
              className="absolute top-1.5 right-1.5 z-10 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white/80 hover:bg-black hover:text-white"
              aria-label="Dismiss teaser"
            >
              <X className="h-3.5 w-3.5" />
            </span>
            <div className="relative aspect-video w-full bg-black">
              {/* Lightweight thumbnail instead of an autoplaying iframe. */}
              <img
                src={THUMB}
                alt="Demo preview"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#d4af37] text-slate-950 shadow-lg">
                  <Play className="h-5 w-5 fill-slate-950" />
                </span>
              </span>
            </div>
            <div className="px-3 py-2.5 text-sm font-medium text-white">
              See Live Demo — click here to watch
            </div>
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
          onClick={closeVideo}
          role="presentation"
        >
          <div
            className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Live demo video"
          >
            <button
              type="button"
              onClick={closeVideo}
              className="absolute -top-3 -right-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/90 text-white/70 shadow-lg transition hover:bg-slate-900 hover:text-white"
              aria-label="Close video"
            >
              <X className="h-5 w-5" />
            </button>
            <iframe
              ref={iframeRef}
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${YT_ID}?autoplay=1&rel=0&enablejsapi=1`}
              title="Agent Business Tracker live demo"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
