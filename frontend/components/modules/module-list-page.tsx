"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/tables/data-table";
import { PageLayout } from "@/components/layout/page-layout";
import { useModuleList } from "@/hooks/use-module-list";

interface ModuleListPageProps<T extends { id: string }> {
  title: string;
  apiPath: string;
  columns: Column<T>[];
  emptyMessage?: string;
  actions?: React.ReactNode;
  back?: string;
}

export function ModuleListPage<T extends { id: string }>({
  title,
  apiPath,
  columns,
  emptyMessage,
  actions,
  back,
}: ModuleListPageProps<T>): React.ReactElement {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useModuleList<T>(apiPath, { page });
  const items = data?.data ?? [];

  return (
    <PageLayout title={title} actions={actions} back={back}>
      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        error={error ? (error instanceof Error ? error.message : "Failed to load data") : null}
        onRetry={() => void refetch()}
        emptyMessage={emptyMessage ?? `No ${title.toLowerCase()} yet`}
        meta={data?.meta}
        onPageChange={setPage}
      />
    </PageLayout>
  );
}
