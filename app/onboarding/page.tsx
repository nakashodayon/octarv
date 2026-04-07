"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sileo, Toaster } from "sileo";

interface Status {
  connected: boolean;
  xUsername: string | null;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">Loading...</div>}>
      <OnboardingInner />
    </Suspense>
  );
}

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [importing, setImporting] = useState(false);
  const error = params.get("error");
  const step = params.get("step");

  useEffect(() => {
    fetch("/api/bookmarks/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => {});
  }, []);

  const handleConnect = () => {
    window.location.href = "/api/auth/x/connect";
  };

  const handleImport = async () => {
    setImporting(true);
    const importPromise = fetch("/api/bookmarks/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 20 }),
    }).then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    });

    sileo.promise(importPromise, {
      loading: { title: "Bookmarks をインポート中" },
      success: (data: any) => ({
        title: `${data.imported} 件インポートしました`,
        duration: 2000,
      }),
      error: { title: "インポートに失敗しました", duration: 3000 },
    });

    try {
      await importPromise;
      router.push("/dashboard");
    } catch {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <Toaster position="bottom-right" />
      <div className="max-w-md w-full flex flex-col items-center gap-8 text-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Octarv</h1>
          <p className="text-muted-foreground">
            Connect your X account to import your bookmarks.
          </p>
        </div>

        {error && (
          <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        {!status ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : !status.connected ? (
          <button
            onClick={handleConnect}
            className="w-full py-3 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
          >
            Connect X Account
          </button>
        ) : (
          <div className="w-full flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-muted/50 text-sm">
              Connected as <span className="font-medium">@{status.xUsername}</span>
            </div>
            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full py-3 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {importing ? "Importing..." : "Import last 20 bookmarks"}
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
