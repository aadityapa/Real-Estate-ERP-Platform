"use client";

import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PageLayoutProps {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  back?: string;
}

export function PageLayout({
  title,
  children,
  actions,
  back,
}: PageLayoutProps): React.ReactElement {
  return (
    <DashboardShell title={title}>
      <div className="space-y-6">
        {(back || actions) && (
          <div className="flex items-center justify-between">
            <div>
              {back && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={back}>
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back
                  </Link>
                </Button>
              )}
            </div>
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </DashboardShell>
  );
}
