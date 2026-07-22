import { create } from "zustand";

interface SidebarState {
  /** Desktop rail collapsed (icon-only) state. */
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;

  /** Mobile off-canvas drawer open state. */
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
  toggleMobile: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: false,
  toggle: () => set((state) => ({ collapsed: !state.collapsed })),
  setCollapsed: (collapsed) => set({ collapsed }),

  mobileOpen: false,
  openMobile: () => set({ mobileOpen: true }),
  closeMobile: () => set({ mobileOpen: false }),
  toggleMobile: () => set((state) => ({ mobileOpen: !state.mobileOpen })),
}));
