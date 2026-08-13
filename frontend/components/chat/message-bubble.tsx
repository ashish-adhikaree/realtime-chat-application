"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, File01Icon, SmileIcon } from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ReactionDetailsSheet } from "@/components/chat/reaction-details-sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { formatDuration, formatFileSize, formatMessageTime, initials } from "@/lib/format";
import type { Attachment, Message } from "@/lib/types";
import { cn } from "@/lib/utils";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "😮", "🙏"];

function AttachmentView({ attachment, isOwn }: { attachment: Attachment; isOwn: boolean }) {
    if (!attachment.url) {
        return (
            <div className="flex items-center gap-2 rounded-lg bg-background/40 p-2 text-sm">
                <HugeiconsIcon icon={File01Icon} className="size-4 shrink-0" />
                <span className="truncate">{attachment.fileName ?? "Attachment unavailable"}</span>
            </div>
        );
    }

    if (attachment.mimeType.startsWith("image/")) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={attachment.url}
                alt={attachment.fileName ?? "Image"}
                className="max-h-80 w-full rounded-lg object-cover"
            />
        );
    }

    if (attachment.mimeType.startsWith("video/")) {
        return <video src={attachment.url} controls className="max-h-80 w-full rounded-lg" />;
    }

    if (attachment.mimeType.startsWith("audio/")) {
        return (
            <div className="flex min-w-56 flex-col gap-1">
                <audio src={attachment.url} controls className="w-full" />
                {attachment.durationMs && (
                    <span className={cn("text-xs", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {formatDuration(attachment.durationMs)}
                    </span>
                )}
            </div>
        );
    }

    return (
        <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg bg-background/40 p-2 text-sm hover:bg-background/60">
            <HugeiconsIcon icon={File01Icon} className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{attachment.fileName ?? "File"}</span>
            <span className="shrink-0 text-xs opacity-70">{formatFileSize(attachment.sizeBytes)}</span>
        </a>
    );
}

export function MessageBubble({
    message,
    isOwn,
    showSender,
    replyTo,
    currentUserId,
    onReact,
    onRemoveReaction,
    onDelete,
}: {
    message: Message;
    isOwn: boolean;
    showSender: boolean;
    replyTo?: Message;
    currentUserId: string;
    onReact: (emoji: string) => void;
    onRemoveReaction: () => void;
    onDelete: () => void;
}) {
    const [reactionsOpen, setReactionsOpen] = useState(false);
    const myReaction = message.reactions.find((reaction) => reaction.reactedByMe);

    return (
        <div className={cn("group flex items-end gap-2", isOwn && "flex-row-reverse")}>
            {!isOwn && (
                <Avatar size="sm" className={cn(!showSender && "invisible")}>
                    <AvatarImage src={message.senderImage ?? undefined} />
                    <AvatarFallback>{initials(message.senderName ?? "?")}</AvatarFallback>
                </Avatar>
            )}

            <div className={cn("flex max-w-[70%] flex-col gap-1", isOwn && "items-end")}>
                {showSender && !isOwn && (
                    <span className="px-1 text-xs font-medium text-muted-foreground">
                        {message.senderName ?? "Deleted user"}
                    </span>
                )}

                <div
                    className={cn(
                        "flex flex-col gap-2 rounded-2xl px-3 py-2 text-sm",
                        isOwn
                            ? "rounded-tr-md bg-primary text-primary-foreground"
                            : "rounded-tl-md bg-card text-card-foreground ring-1 ring-foreground/10",
                        message.hiddenByBlock && "bg-muted text-muted-foreground ring-foreground/10"
                    )}>
                    {replyTo && (
                        <div
                            className={cn(
                                "rounded-md border-l-2 px-2 py-1 text-xs",
                                isOwn
                                    ? "border-primary-foreground/50 bg-primary-foreground/10"
                                    : "border-primary bg-muted"
                            )}>
                            <p className="font-medium">{replyTo.senderName ?? "Deleted user"}</p>
                            <p className="truncate opacity-80">{replyTo.content ?? "Attachment"}</p>
                        </div>
                    )}

                    {message.hiddenByBlock ? (
                        <span className="italic opacity-70">
                            You can&apos;t see this message because you are blocked
                        </span>
                    ) : message.deletedAt ? (
                        <span className="italic opacity-70">This message was deleted</span>
                    ) : (
                        <>
                            {message.attachments.map((attachment) => (
                                <AttachmentView key={attachment.id} attachment={attachment} isOwn={isOwn} />
                            ))}
                            {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                        </>
                    )}
                </div>

                {message.reactions.length > 0 && (
                    <div className={cn("flex flex-wrap gap-1", isOwn && "justify-end")}>
                        {message.reactions.map((reaction) => (
                            <Tooltip key={reaction.emoji}>
                                <TooltipTrigger
                                    render={
                                        <button
                                            type="button"
                                            aria-label={`See who reacted ${reaction.emoji}`}
                                            onClick={() => setReactionsOpen(true)}
                                            className={cn(
                                                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ring-1 transition-colors",
                                                reaction.reactedByMe
                                                    ? "bg-primary/15 ring-primary"
                                                    : "bg-card ring-foreground/10 hover:bg-accent"
                                            )}
                                        />
                                    }>
                                    <span>{reaction.emoji}</span>
                                    <span className="tabular-nums">{reaction.count}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {reaction.users.map((person) => person.name).join(", ")}
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                )}

                <div
                    className={cn(
                        "flex items-center gap-1 px-1 text-xs text-muted-foreground",
                        isOwn && "flex-row-reverse"
                    )}>
                    <span>{formatMessageTime(message.createdAt)}</span>
                    {message.editedAt && <span>edited</span>}

                    <div
                        className={cn(
                            "flex items-center opacity-0 transition-opacity group-hover:opacity-100",
                            message.hiddenByBlock && "hidden"
                        )}>
                        <Popover>
                            <PopoverTrigger render={<Button size="icon-sm" variant="ghost" aria-label="Add reaction" />}>
                                <HugeiconsIcon icon={SmileIcon} className="size-3.5" />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto flex-row gap-1 p-1">
                                {QUICK_REACTIONS.map((emoji) => (
                                    <Button
                                        key={emoji}
                                        size="icon-sm"
                                        variant={myReaction?.emoji === emoji ? "secondary" : "ghost"}
                                        onClick={() => onReact(emoji)}>
                                        {emoji}
                                    </Button>
                                ))}
                            </PopoverContent>
                        </Popover>

                        {isOwn && !message.deletedAt && (
                            <Button size="icon-sm" variant="ghost" aria-label="Delete message" onClick={onDelete}>
                                <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <ReactionDetailsSheet
                open={reactionsOpen}
                onOpenChange={setReactionsOpen}
                reactions={message.reactions}
                currentUserId={currentUserId}
                onRemoveOwn={onRemoveReaction}
            />
        </div>
    );
}
