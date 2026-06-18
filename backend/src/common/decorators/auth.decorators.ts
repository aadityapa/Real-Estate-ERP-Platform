import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(IS_PUBLIC_KEY, true);

export const PERMISSIONS_KEY = "permissions";
export const RequirePermissions = (
  ...permissions: string[]
): ReturnType<typeof SetMetadata> => SetMetadata(PERMISSIONS_KEY, permissions);

export const ROLES_KEY = "roles";
export const RequireRoles = (
  ...roles: string[]
): ReturnType<typeof SetMetadata> => SetMetadata(ROLES_KEY, roles);
