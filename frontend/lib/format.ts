import type { Message, MessageMetadata, SystemEvent } from "@/lib/types";

const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const shortDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const fullDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });

function startOfDay(value: Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function daysAgo(value: Date) {
    return Math.round((startOfDay(new Date()) - startOfDay(value)) / 86_400_000);
}

export function formatMessageTime(value: string | Date) {
    return time.format(new Date(value));
}

export function formatConversationTime(value: string | Date | null) {
    if (!value) return "";

    const date = new Date(value);
    const days = daysAgo(date);

    if (days === 0) return time.format(date);
    if (days === 1) return "Yesterday";
    if (days < 7) return weekday.format(date);
    if (date.getFullYear() === new Date().getFullYear()) return shortDate.format(date);
    return fullDate.format(date);
}

export function formatDayDivider(value: string | Date) {
    const date = new Date(value);
    const days = daysAgo(date);

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return weekday.format(date);
    if (date.getFullYear() === new Date().getFullYear()) return shortDate.format(date);
    return fullDate.format(date);
}

export function isSameDay(a: string | Date, b: string | Date) {
    return startOfDay(new Date(a)) === startOfDay(new Date(b));
}

export function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(ms: number) {
    const total = Math.round(ms / 1000);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function initials(name: string) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "?";
}

export function describeSystemMessage(message: Message, nameById: Map<string, string>) {
    const actor = message.senderName ?? "Someone";
    const metadata: MessageMetadata = message.metadata ?? {};
    const targets = (metadata.targetUserIds ?? []).map((id) => nameById.get(id) ?? "someone");
    const targetList = targets.length > 0 ? targets.join(", ") : "someone";

    const describe: Record<SystemEvent, string> = {
        group_created: `${actor} created ${metadata.newName ? `"${metadata.newName}"` : "the group"}`,
        member_added: `${actor} added ${targetList}`,
        member_removed: `${actor} removed ${targetList}`,
        member_left: `${targetList} left the group`,
        role_changed: `${actor} made ${targetList} ${metadata.newRole === "admin" ? "an admin" : "a member"}`,
        group_renamed: `${actor} renamed the group to "${metadata.newName ?? ""}"`,
        group_image_changed: `${actor} changed the group image`,
        request_declined: `${actor} declined the message request`,
        request_reopened: `${actor} sent the message request again`,
        request_accepted: `${actor} accepted the message request`,
    };

    return message.systemEvent ? describe[message.systemEvent] : "";
}
