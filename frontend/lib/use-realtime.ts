"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/lib/config";

export type RealtimePayload = { conversationId?: string; messageId?: string };

export type RealtimeHandlers = {
    onMessage?: (payload: RealtimePayload) => void;
    onMessageUpdated?: (payload: RealtimePayload) => void;
    onMessageDeleted?: (payload: RealtimePayload) => void;
    onConversationUpdated?: (payload: RealtimePayload) => void;
    onConversationRemoved?: (payload: RealtimePayload) => void;
    onRequest?: (payload: RealtimePayload) => void;
    onConnectionChange?: (connected: boolean) => void;
};

export function useRealtime(handlers: RealtimeHandlers) {
    const ref = useRef(handlers);
    ref.current = handlers;

    useEffect(() => {
        const socket: Socket = io(API_URL, {
            path: "/realtime",
            withCredentials: true,
            transports: ["websocket", "polling"],
        });

        socket.on("connect", () => ref.current.onConnectionChange?.(true));
        socket.on("disconnect", () => ref.current.onConnectionChange?.(false));
        socket.on("connect_error", () => ref.current.onConnectionChange?.(false));

        socket.on("message:new", (p: RealtimePayload) => ref.current.onMessage?.(p));
        socket.on("message:updated", (p: RealtimePayload) => ref.current.onMessageUpdated?.(p));
        socket.on("message:deleted", (p: RealtimePayload) => ref.current.onMessageDeleted?.(p));
        socket.on("conversation:updated", (p: RealtimePayload) => ref.current.onConversationUpdated?.(p));
        socket.on("conversation:removed", (p: RealtimePayload) => ref.current.onConversationRemoved?.(p));
        socket.on("request:new", (p: RealtimePayload) => ref.current.onRequest?.(p));

        return () => {
            socket.close();
        };
    }, []);
}
