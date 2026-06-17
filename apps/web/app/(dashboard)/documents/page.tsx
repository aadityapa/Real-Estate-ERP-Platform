"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";

type Document = {
  id: string;
  name: string;
  category: string;
  createdAt: string;
};

export default function DocumentsPage(): React.ReactElement {
  return (
    <ModuleListPage<Document>
      title="Documents"
      apiPath="/documents"
      columns={[
        { key: "name", header: "Name" },
        { key: "category", header: "Category" },
        {
          key: "createdAt",
          header: "Created",
          render: (row) =>
            new Date(row.createdAt).toLocaleDateString("en-IN"),
        },
      ]}
    />
  );
}
