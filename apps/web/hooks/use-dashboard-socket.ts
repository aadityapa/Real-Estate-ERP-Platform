"use client";

import { useEffect, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { WS_URL } from "@/lib/env";
import { useAuthStore } from "@/stores/auth-store";

export interface DashboardEvent {
  type: string;
  module: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export function useDashboardSocket(): {
  events: DashboardEvent[];
  connected: boolean;
} {
  const token = useAuthStore((s) => s.accessToken);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [connected, setConnected] = useState(false);

  const addEvent = useCallback((event: DashboardEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 20));
  }, []);

  useEffect(() => {
    if (!token) return;

    const socket: Socket = io(`${WS_URL}/events`, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("dashboard:update", (event: DashboardEvent) => {
      addEvent(event);
    });

    return () => {
      socket.disconnect();
    };
  }, [token, addEvent]);

  return { events, connected };
}
