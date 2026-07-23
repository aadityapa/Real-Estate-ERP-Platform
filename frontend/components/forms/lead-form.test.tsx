import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeadForm } from "@/components/forms/lead-form";

afterEach(() => {
  cleanup();
});

describe("LeadForm", () => {
  it("shows Zod validation errors and does not submit invalid data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LeadForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /save lead/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/valid phone required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits when required fields are valid", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LeadForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/first name/i), "Priya");
    await user.type(screen.getByLabelText(/^phone$/i), "9876543211");
    await user.click(screen.getByRole("button", { name: /save lead/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      firstName: "Priya",
      phone: "9876543211",
      source: "WEBSITE",
      priority: "MEDIUM",
    });
  });
});
