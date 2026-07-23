import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";

const patch = vi.fn().mockResolvedValue({});
const invalidateQueries = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/api", () => ({
  api: {
    patch: (...args: unknown[]) => patch(...args),
  },
}));

vi.mock("@/hooks/use-leads", () => ({
  useLeads: () => ({
    data: {
      data: [
        {
          id: "lead-1",
          firstName: "Rahul",
          lastName: "Sharma",
          phone: "9876543210",
          source: "WEBSITE",
          status: "NEW",
          priority: "HIGH",
          score: 50,
          createdAt: new Date().toISOString(),
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries }),
  };
});

import { SalesPipeline } from "@/components/modules/crm/sales-pipeline";
import {
  commitPipelineStageMove,
  resolvePipelineStageMove,
} from "@/lib/crm/pipeline";

function renderPipeline() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <SalesPipeline />
    </QueryClientProvider>,
  );
}

describe("SalesPipeline board", () => {
  beforeEach(() => {
    patch.mockClear();
    invalidateQueries.mockClear();
  });

  it("renders leads in their stage columns", () => {
    renderPipeline();
    expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Booking")).toBeInTheDocument();
  });

  it("updates stage via pipeline move helpers (drag end path)", async () => {
    const lead = { id: "lead-1", status: "NEW" };
    const newStatus = resolvePipelineStageMove(lead, "BOOKING");
    expect(newStatus).toBe("BOOKING");

    await commitPipelineStageMove({
      leadId: lead.id,
      newStatus: newStatus!,
      patch: (path, body) => patch(path, body),
      onSuccess: () => {
        invalidateQueries({ queryKey: ["leads"] });
      },
    });

    expect(patch).toHaveBeenCalledWith("/crm/leads/lead-1", {
      status: "BOOKING",
    });
    expect(invalidateQueries).toHaveBeenCalled();
  });
});
