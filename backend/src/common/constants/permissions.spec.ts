import { ForbiddenException } from "@nestjs/common";
import {
  isCrmLeadManager,
  Permissions,
} from "../constants/permissions";

describe("isCrmLeadManager", () => {
  it("returns true for Super Admin / Admin / Sales Manager roles", () => {
    expect(isCrmLeadManager(["Sales Manager"], [])).toBe(true);
    expect(isCrmLeadManager(["Admin"], [])).toBe(true);
    expect(isCrmLeadManager(["Super Admin"], [])).toBe(true);
  });

  it("returns true when crm:manage:leads permission is present", () => {
    expect(
      isCrmLeadManager(["Sales Rep"], [Permissions.CRM_LEADS_MANAGE]),
    ).toBe(true);
  });

  it("returns false for ordinary reps without manage permission", () => {
    expect(
      isCrmLeadManager(["Sales Rep"], [Permissions.CRM_LEADS_WRITE]),
    ).toBe(false);
  });
});
