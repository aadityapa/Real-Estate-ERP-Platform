import { describe, expect, it, vi } from "vitest";
import {
  commitPipelineStageMove,
  resolvePipelineStageMove,
} from "@/lib/crm/pipeline";

describe("resolvePipelineStageMove", () => {
  const lead = { id: "lead-1", status: "NEW" };

  it("returns the drop stage when moving to a different pipeline column", () => {
    expect(resolvePipelineStageMove(lead, "BOOKING")).toBe("BOOKING");
  });

  it("returns null when dropping on the same stage (no reorder API call)", () => {
    expect(resolvePipelineStageMove(lead, "NEW")).toBeNull();
  });

  it("returns null for unknown drop targets", () => {
    expect(resolvePipelineStageMove(lead, "not-a-stage")).toBeNull();
    expect(resolvePipelineStageMove(lead, null)).toBeNull();
    expect(resolvePipelineStageMove(undefined, "BOOKING")).toBeNull();
  });
});

describe("commitPipelineStageMove", () => {
  it("patches lead status and runs onSuccess (drag update stage)", async () => {
    const patch = vi.fn().mockResolvedValue({});
    const onSuccess = vi.fn();

    await commitPipelineStageMove({
      leadId: "lead-1",
      newStatus: "NEGOTIATION",
      patch,
      onSuccess,
    });

    expect(patch).toHaveBeenCalledWith("/crm/leads/lead-1", {
      status: "NEGOTIATION",
    });
    expect(onSuccess).toHaveBeenCalledOnce();
  });
});
