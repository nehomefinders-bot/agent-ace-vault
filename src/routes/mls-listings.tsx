import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const ALLOWED_EMAIL = "nehomefinders@gmail.com";
const MLS_URL = "https://www.mlspin.com/";

export const Route = createFileRoute("/mls-listings")({
  head: () => ({
    meta: [
      { title: "MLS Listings" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MlsListingsPage,
});

function MlsListingsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [frameLoaded, setFrameLoaded] = useState(false);

  const allowed =
    !!user?.email && user.email.trim().toLowerCase() === ALLOWED_EMAIL;

  useEffect(() => {
    if (!loading && !allowed) {
      navigate({ to: "/dashboard" });
    }
  }, [loading, allowed, navigate]);

  if (loading || !allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col lg:h-dvh">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur lg:px-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">MLS Listings</h1>
          <p className="text-xs text-muted-foreground">
            MLS PIN broker portal — embedded workspace
          </p>
        </div>
        <a
          href={MLS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in new tab
        </a>
      </header>

      <div className="relative flex-1 min-h-0 bg-muted/30">
        {!frameLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <div className="text-sm text-muted-foreground">
                Loading MLS portal…
              </div>
            </div>
          </div>
        )}
        <iframe
          title="MLS PIN"
          src={MLS_URL}
          onLoad={() => setFrameLoaded(true)}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          className="h-full w-full border-0 bg-white"
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>
    </div>
  );
}
