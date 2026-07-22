"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Auth guard for every dashboard route: waits for the persisted auth
 * store to hydrate, then redirects unauthenticated visitors to /login.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement | null {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace("/login");
    }
  }, [hydrated, accessToken, router]);

  if (!hydrated || !accessToken) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        role="status"
        aria-label="Loading"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-accent" />
      </div>
    );
  }

  return <>{children}</>;
}
