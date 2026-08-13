"use client";

import { useEffect, useMemo, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "@/components/chat/message-bubble";
import { describeSystemMessage, formatDayDivider, isSameDay } from "@/lib/format";
import type { ConversationMember, Message } from "@/lib/types";

function Divider({ label }: { label: string }) {
    return (
        <div className="flex items-center justify-center py-1">
            <span className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground ring-1 ring-foreground/10">
                {label}
            </span>
        </div>
    );
}

export function MessageThread({
    messages,
    members,
    currentUserId,
    loading,
    hasMore,
    loadingMore,
    onLoadMore,
    onReact,
    onRemoveReaction,
    onDelete,
}: {
    messages: Message[];
    members: ConversationMember[];
    currentUserId: string;
    loading: boolean;
    hasMore: boolean;
    loadingMore: boolean;
    onLoadMore: () => void;
    onReact: (messageId: string, emoji: string) => void;
    onRemoveReaction: (messageId: string) => void;
    onDelete: (messageId: string) => void;
}) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const lastSeq = messages[messages.length - 1]?.seq;

    const nameById = useMemo(() => new Map(members.map((member) => [member.id, member.name])), [members]);
    const messageById = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }, [lastSeq]);

    if (loading) {
        return (
            <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                {[70, 45, 60, 35].map((width, index) => (
                    <Skeleton
                        key={index}
                        className="h-12 rounded-2xl"
                        style={{ width: `${width}%`, marginLeft: index % 2 ? "auto" : undefined }}
                    />
                ))}
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-center">
                <p className="text-sm text-muted-foreground">No messages yet. Say hello.</p>
            </div>
        );
    }

    return (
        <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-3 p-4">
                {hasMore && (
                    <div className="flex justify-center">
                        <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={loadingMore}>
                            {loadingMore ? "Loading..." : "Load earlier messages"}
                        </Button>
                    </div>
                )}

                {messages.map((message, index) => {
                    const previous = messages[index - 1];
                    const showDivider = !previous || !isSameDay(previous.createdAt, message.createdAt);

                    if (message.type === "system") {
                        return (
                            <div key={message.id} className="flex flex-col gap-3">
                                {showDivider && <Divider label={formatDayDivider(message.createdAt)} />}
                                <Divider label={describeSystemMessage(message, nameById)} />
                            </div>
                        );
                    }

                    const showSender =
                        !previous || previous.senderId !== message.senderId || previous.type === "system";

                    return (
                        <div key={message.id} className="flex flex-col gap-3">
                            {showDivider && <Divider label={formatDayDivider(message.createdAt)} />}
                            <MessageBubble
                                message={message}
                                isOwn={message.senderId === currentUserId}
                                showSender={showSender}
                                currentUserId={currentUserId}
                                replyTo={message.replyToId ? messageById.get(message.replyToId) : undefined}
                                onReact={(emoji) => onReact(message.id, emoji)}
                                onRemoveReaction={() => onRemoveReaction(message.id)}
                                onDelete={() => onDelete(message.id)}
                            />
                        </div>
                    );
                })}

                <div ref={bottomRef} />
            </div>
        </ScrollArea>
    );
}
