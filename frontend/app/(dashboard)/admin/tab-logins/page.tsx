"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { useTabLogins } from "@/hooks/use-lms";
import { api } from "@/lib/api";

const ALL_TABS = [
  "lms", "leads", "appointments", "site-visits", "data-feed", "reports",
  "goals", "support", "crm", "sales", "construction", "finance", "hr", "admin",
];

type TabLoginRow = {
  id: string;
  tabId: string;
  label: string;
  allowedTabs: string[];
  defaultTab: string;
  role?: { name: string };
};

export default function TabLoginsPage(): React.ReactElement {
  const { data, isLoading } = useTabLogins();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    roleId: "",
    tabId: `TAB_${Date.now()}`,
    label: "",
    allowedTabs: ["lms", "leads"],
    defaultTab: "lms",
    theme: "#3b82f6",
  });

  const save = useMutation({
    mutationFn: () => api.post("/admin/tab-logins", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "tab-logins"] });
      setShowForm(false);
    },
  });

  const configs = ((data ?? []) as TabLoginRow[]) ?? [];

  return (
    <PageLayout
      title="Tab Login Manager"
      back="/admin"
      actions={
        <Button variant="accent" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Create Tab Login"}
        </Button>
      }
    >
      {showForm && (
        <Card className="mb-4">
          <CardContent className="grid gap-3 pt-4 md:grid-cols-2">
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Role ID"
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
            />
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Tab ID"
              value={form.tabId}
              onChange={(e) => setForm({ ...form, tabId: e.target.value })}
            />
            <input
              className="rounded border px-3 py-2 text-sm md:col-span-2"
              placeholder="Label (e.g. Sales Executive View)"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-medium">Allowed Tabs</p>
              <div className="flex flex-wrap gap-2">
                {ALL_TABS.map((tab) => (
                  <label key={tab} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={form.allowedTabs.includes(tab)}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          allowedTabs: e.target.checked
                            ? [...form.allowedTabs, tab]
                            : form.allowedTabs.filter((t) => t !== tab),
                        });
                      }}
                    />
                    {tab}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={() => save.mutate()} disabled={!form.roleId || !form.label}>
              Save
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading...</div>
      ) : (
        <DataTable
          columns={[
            { key: "tabId", header: "Tab ID" },
            {
              key: "role",
              header: "Role",
              render: (row) => row.role?.name ?? "—",
            },
            { key: "label", header: "Label" },
            {
              key: "allowedTabs",
              header: "Allowed Tabs",
              render: (row) => row.allowedTabs.join(", "),
            },
            { key: "defaultTab", header: "Default Tab" },
          ]}
          data={configs}
        />
      )}
    </PageLayout>
  );
}
