"use client";

import "../sentry.client.config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { useAuthStore } from "@/stores/auth-store";

export function Providers({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!process.env["NEXT_PUBLIC_SENTRY_DSN"]) return;
    if (tenantId) {
      Sentry.setTag("tenantId", tenantId);
    }
    if (userId) {
      Sentry.setUser({ id: userId });
    } else {
      Sentry.setUser(null);
    }
  }, [tenantId, userId]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
