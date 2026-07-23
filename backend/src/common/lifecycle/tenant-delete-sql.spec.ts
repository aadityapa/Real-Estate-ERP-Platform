import { TENANT_DELETE_STEPS, tenantDeleteLabels } from "./tenant-delete-sql";

describe("tenant-delete-sql", () => {
  it("ends with tenant row delete", () => {
    const labels = tenantDeleteLabels();
    expect(labels[labels.length - 1]).toBe("tenant");
  });

  it("deletes audit logs before the tenant row", () => {
    const labels = tenantDeleteLabels();
    expect(labels.indexOf("audit_logs")).toBeLessThan(labels.indexOf("tenant"));
  });

  it("deletes clash leads and activities before leads", () => {
    const labels = tenantDeleteLabels();
    expect(labels.indexOf("clash_leads")).toBeLessThan(labels.indexOf("leads"));
    expect(labels.indexOf("activities")).toBeLessThan(labels.indexOf("leads"));
  });

  it("deletes ypsr before site visits", () => {
    const labels = tenantDeleteLabels();
    expect(labels.indexOf("ypsr_reports")).toBeLessThan(
      labels.indexOf("site_visits"),
    );
  });

  it("deletes customer consents before customers", () => {
    const labels = tenantDeleteLabels();
    expect(labels.indexOf("customer_consents")).toBeLessThan(
      labels.indexOf("customers"),
    );
    expect(labels.indexOf("data_subject_requests")).toBeLessThan(
      labels.indexOf("customers"),
    );
  });

  it("parameterizes every step with $1", () => {
    for (const step of TENANT_DELETE_STEPS) {
      expect(step.sql).toContain("$1");
      expect(step.label.length).toBeGreaterThan(0);
    }
  });

  it("uses GoodsReceiptNote.poId column", () => {
    const grn = TENANT_DELETE_STEPS.find((s) => s.label === "goods_receipts");
    expect(grn?.sql).toContain('"poId"');
  });
});
