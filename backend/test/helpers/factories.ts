/**
 * Test factories for PropOS backend unit/integration tests.
 * Prefer these over ad-hoc fixture objects so tenant scoping stays explicit.
 */

export interface TestTenant {
  id: string;
  name: string;
  slug: string;
}

export interface TestUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  passwordHash: string;
  roles: Array<{
    role: {
      name: string;
      permissions: Array<{ permission: { code: string } }>;
    };
  }>;
}

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

export function createTestTenant(
  overrides: Partial<TestTenant> = {},
): TestTenant {
  const id = overrides.id ?? nextId("tenant");
  return {
    id,
    name: overrides.name ?? `Tenant ${id}`,
    slug: overrides.slug ?? id,
  };
}

export function createTestUser(
  tenantId: string,
  role = "Sales Rep",
  overrides: Partial<TestUser> = {},
): TestUser {
  const id = overrides.id ?? nextId("user");
  return {
    id,
    tenantId,
    email: overrides.email ?? `${id}@test.propos.in`,
    firstName: overrides.firstName ?? "Test",
    lastName: overrides.lastName ?? "User",
    status: overrides.status ?? "ACTIVE",
    // bcrypt hash of "Admin@123" is not required for mocked compares
    passwordHash: overrides.passwordHash ?? "$2b$12$testhash",
    roles: overrides.roles ?? [
      {
        role: {
          name: role,
          permissions: [],
        },
      },
    ],
  };
}

export function resetFactoryIds(): void {
  seq = 0;
}
