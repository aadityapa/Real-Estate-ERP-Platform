import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { JwtPayload } from "@propos/shared-types";

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setAuth: (tokens: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
  }) => void;
  logout: () => void;
  getToken: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setAuth: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
      getToken: () => get().accessToken,
    }),
    { name: "propos-auth" },
  ),
);

export type { AuthUser, JwtPayload };
