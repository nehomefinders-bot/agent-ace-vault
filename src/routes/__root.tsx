import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { PaywallGate } from "@/components/paywall-gate";
import { SupportFab } from "@/components/support-fab";
import { applyTheme, createThemeSync, getStoredTheme, getThemeBootstrapScript } from "@/lib/theme";
import { installServerFnAuth } from "@/integrations/supabase/server-fn-auth";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Agent Business Tracker - Business tracker for brokers & agents" },
      { name: "description", content: "QuickBooks for real estate. Track deals, commissions, invoices, expenses, mileage and clients in one cockpit." },
      { property: "og:title", content: "Agent Business Tracker - Business tracker for brokers & agents" },
      { name: "twitter:title", content: "Agent Business Tracker - Business tracker for brokers & agents" },
      { property: "og:description", content: "QuickBooks for real estate. Track deals, commissions, invoices, expenses, mileage and clients in one cockpit." },
      { name: "twitter:description", content: "QuickBooks for real estate. Track deals, commissions, invoices, expenses, mileage and clients in one cockpit." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/1d29e18f-a478-4c8d-b62b-0a4afcdf8c1d" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/1d29e18f-a478-4c8d-b62b-0a4afcdf8c1d" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Abhaya+Libre:wght@400;500;600;700;800&display=swap" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: getThemeBootstrapScript() }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const bare = path === "/auth" || path === "/landing";
  const showSupportFab = !bare;
  return (
    <>
      <ThemeBridge />
      {bare ? (
        <div className="min-h-dvh w-full bg-background">
          <Outlet />
        </div>
      ) : (
        <div className="flex min-h-dvh w-full flex-col bg-background lg:flex-row">
          <AppSidebar />
          <main className="app-content-backdrop relative isolate flex-1 min-w-0 w-full overflow-x-hidden">
            <div className="relative z-10">
              <PaywallGate>
                <Outlet />
              </PaywallGate>
            </div>
          </main>
        </div>
      )}
      {showSupportFab ? <SupportFab /> : null}
    </>
  );
}

function ThemeBridge() {
  useEffect(() => {
    installServerFnAuth();
    applyTheme(getStoredTheme());
    return createThemeSync();
  }, []);

  return null;
}
