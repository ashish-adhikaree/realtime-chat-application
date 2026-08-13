"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { InformationCircleIcon, PinIcon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { initials } from "@/lib/format";
import type { Conversation, ConversationDetail } from "@/lib/types";

export function ChatHeader({
    conversation,
    detail,
    onOpenInfo,
    onTogglePin,
}: {
    conversation: Conversation;
    detail: ConversationDetail | null;
    onOpenInfo: () => void;
    onTogglePin: () => void;
}) {
    const activeMembers = detail?.members.filter((member) => member.active) ?? [];
    const subtitle =
        conversation.type === "group"
            ? `${activeMembers.length || conversation.memberCount} members`
            : (activeMembers.find((member) => member.id === conversation.otherUserId)?.username ?? "Direct message");

    return (
        <header className="bg-card px-4 py-2">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    aria-label="Conversation details"
                    onClick={onOpenInfo}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Avatar>
                        <AvatarImage src={conversation.image ?? undefined} />
                        <AvatarFallback>
                            {conversation.type === "group" ? (
                                <HugeiconsIcon icon={UserGroupIcon} className="size-4" />
                            ) : (
                                initials(conversation.name)
                            )}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="truncate font-medium">{conversation.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                            {conversation.type === "group" || subtitle === "Direct message"
                                ? subtitle
                                : `@${subtitle}`}
                        </p>
                    </div>
                </button>

                {conversation.type === "group" && activeMembers.length > 1 && (
                    <AvatarGroup>
                        {activeMembers.slice(0, 4).map((member) => (
                            <Avatar key={member.id} size="sm">
                                <AvatarImage src={member.image ?? undefined} />
                                <AvatarFallback>{initials(member.name)}</AvatarFallback>
                            </Avatar>
                        ))}
                    </AvatarGroup>
                )}

                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    size="icon-sm"
                                    variant={conversation.pinned ? "secondary" : "ghost"}
                                    aria-label={conversation.pinned ? "Unpin conversation" : "Pin conversation"}
                                    onClick={onTogglePin}
                                />
                            }>
                            <HugeiconsIcon icon={PinIcon} />
                        </TooltipTrigger>
                        <TooltipContent>{conversation.pinned ? "Unpin" : "Pin"}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label={conversation.type === "group" ? "Group info" : "Contact info"}
                                    onClick={onOpenInfo}
                                />
                            }>
                            <HugeiconsIcon icon={InformationCircleIcon} />
                        </TooltipTrigger>
                        <TooltipContent>{conversation.type === "group" ? "Group info" : "Contact info"}</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </header>
    );
}
