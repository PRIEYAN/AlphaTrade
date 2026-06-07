import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 grid-bg">
      <div className="max-w-md text-center border-brutal bg-card p-8 shadow-brutal-lg">
        <h1 className="text-7xl font-display">404</h1>
        <h2 className="mt-4 text-xl font-display uppercase">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn't exist on AlphaTrade.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block border-brutal bg-pink px-4 py-2 text-sm font-display uppercase shadow-brutal-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
        >
          Go home →
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center border-brutal bg-card p-8 shadow-brutal-lg">
        <h1 className="text-xl font-display uppercase">Something broke</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="border-brutal bg-lime px-4 py-2 text-sm font-display uppercase shadow-brutal-sm"
          >
            Try again
          </button>
          <a href="/" className="border-brutal bg-card px-4 py-2 text-sm font-display uppercase shadow-brutal-sm">
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AlphaTrade — Autonomous Crypto Trading Agent" },
      { name: "description", content: "Self-custody AI trading agent. Groq-powered decisions, hard guardrails, Trust Wallet signing. Built for BNB Chain." },
      { property: "og:title", content: "AlphaTrade — Autonomous Crypto Trading Agent" },
      { property: "og:description", content: "Self-custody AI trading agent for BNB Chain." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            border: "3px solid #0a0a0a",
            borderRadius: 0,
            boxShadow: "5px 5px 0 0 #0a0a0a",
            fontFamily: "Space Grotesk, sans-serif",
          },
        }}
      />
    </QueryClientProvider>
  );
}
