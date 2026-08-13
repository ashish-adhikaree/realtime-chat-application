import { API_URL } from "@/lib/config";
import type {
    Contact,
    Conversation,
    ConversationDetail,
    Message,
    MessagePage,
    MessageRequest,
    NonContactPolicy,
    Profile,
    PublicUser,
} from "@/lib/types";

const BASE = `${API_URL}/api/v1`;

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${BASE}${path}`, {
        ...init,
        credentials: "include",
        headers: {
            ...(init.body ? { "Content-Type": "application/json" } : {}),
            ...init.headers,
        },
    });

    if (!response.ok) {
        let message = response.statusText;
        try {
            const body = await response.json();
            message = body.error ?? body.message ?? message;
        } catch {
            // response had no JSON body
        }
        throw new ApiError(message, response.status);
    }

    if (response.status === 204) return undefined as T;

    return response.json() as Promise<T>;
}

const body = (value: unknown) => JSON.stringify(value);

export const api = {
    getProfile: () => request<Profile>("/users/me"),
    updateProfile: (input: { name?: string }) => request<Profile>("/users/me", { method: "PATCH", body: body(input) }),
    updateSettings: (input: { nonContactPolicy?: NonContactPolicy; allowGroupInvitesFromNonContacts?: boolean }) =>
        request<Profile>("/users/me/settings", { method: "PATCH", body: body(input) }),
    setAvatar: (objectKey: string | null) =>
        request<Profile>("/users/me/avatar", { method: "PUT", body: body({ objectKey }) }),
    searchUsers: (q: string) => request<PublicUser[]>(`/users/search?q=${encodeURIComponent(q)}`),

    listContacts: () => request<Contact[]>("/contacts"),
    addContact: (userId: string, alias?: string) =>
        request<Contact[]>("/contacts", { method: "POST", body: body({ userId, alias }) }),
    updateContact: (userId: string, input: { alias?: string | null; favorite?: boolean }) =>
        request<Contact[]>(`/contacts/${userId}`, { method: "PATCH", body: body(input) }),
    removeContact: (userId: string) => request<Contact[]>(`/contacts/${userId}`, { method: "DELETE" }),
    listBlocked: () => request<PublicUser[]>("/contacts/blocked"),
    blockUser: (userId: string) => request<PublicUser[]>("/contacts/blocked", { method: "POST", body: body({ userId }) }),
    unblockUser: (userId: string) => request<PublicUser[]>(`/contacts/blocked/${userId}`, { method: "DELETE" }),

    listConversations: () => request<Conversation[]>("/conversations"),
    getConversation: (id: string) => request<ConversationDetail>(`/conversations/${id}`),
    createDirect: (userId: string) =>
        request<{ id: string }>("/conversations/direct", { method: "POST", body: body({ userId }) }),
    createGroup: (input: { name: string; description?: string | null; imageKey?: string | null; memberIds: string[] }) =>
        request<{ id: string }>("/conversations/group", { method: "POST", body: body(input) }),
    updateGroup: (id: string, input: { name?: string; description?: string | null; imageKey?: string | null }) =>
        request<ConversationDetail>(`/conversations/${id}`, { method: "PATCH", body: body(input) }),
    addMembers: (id: string, userIds: string[], includeHistory: boolean) =>
        request<ConversationDetail>(`/conversations/${id}/members`, {
            method: "POST",
            body: body({ userIds, includeHistory }),
        }),
    updateMemberRole: (id: string, userId: string, role: "admin" | "member") =>
        request<ConversationDetail>(`/conversations/${id}/members/${userId}`, {
            method: "PATCH",
            body: body({ role }),
        }),
    removeMember: (id: string, userId: string) =>
        request<ConversationDetail>(`/conversations/${id}/members/${userId}`, { method: "DELETE" }),
    leaveConversation: (id: string) => request<void>(`/conversations/${id}/leave`, { method: "POST" }),
    setPinned: (id: string, pinned: boolean) =>
        request<void>(`/conversations/${id}/pin`, { method: "PATCH", body: body({ pinned }) }),
    setMuted: (id: string, mutedUntil: string | null) =>
        request<void>(`/conversations/${id}/mute`, { method: "PATCH", body: body({ mutedUntil }) }),

    listRequests: () => request<MessageRequest[]>("/conversations/requests"),
    respondToRequest: (id: string, action: "accept" | "decline" | "reopen") =>
        request<void>(`/conversations/${id}/request`, { method: "POST", body: body({ action }) }),

    listMessages: (id: string, before?: number) =>
        request<MessagePage>(`/conversations/${id}/messages${before ? `?before=${before}` : ""}`),
    sendMessage: (
        id: string,
        input: {
            content?: string;
            type?: "text" | "image" | "video" | "audio" | "file";
            replyToId?: string;
            attachments?: {
                objectKey: string;
                mimeType: string;
                sizeBytes: number;
                fileName?: string;
                width?: number;
                height?: number;
                durationMs?: number;
            }[];
        }
    ) => request<Message>(`/conversations/${id}/messages`, { method: "POST", body: body(input) }),
    deleteMessage: (id: string) => request<void>(`/messages/${id}`, { method: "DELETE" }),
    setReaction: (id: string, emoji: string) =>
        request<void>(`/messages/${id}/reaction`, { method: "PUT", body: body({ emoji }) }),
    removeReaction: (id: string) => request<void>(`/messages/${id}/reaction`, { method: "DELETE" }),

    createUploadUrl: (purpose: "avatar" | "group-image" | "message", mimeType: string) =>
        request<{ objectKey: string; uploadUrl: string; expiresIn: number }>("/uploads", {
            method: "POST",
            body: body({ purpose, mimeType }),
        }),
};

export async function uploadFile(purpose: "avatar" | "group-image" | "message", file: File) {
    const { objectKey, uploadUrl } = await api.createUploadUrl(purpose, file.type || "application/octet-stream");

    const response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
    });

    if (!response.ok) throw new ApiError("Upload failed", response.status);

    return objectKey;
}
