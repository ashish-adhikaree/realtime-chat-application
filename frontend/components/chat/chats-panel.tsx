"use client";

import { useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PinIcon, Search01Icon, StarIcon, UserAdd01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatConversationTime, initials } from "@/lib/format";
import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS = ["All", "Requests", "Favourites", "Groups", "Direct"] as const;

type Filter = (typeof FILTERS)[number];

function isRequest(conversation: Conversation) {
    return conversation.requestState === "pending" && conversation.isRequestRecipient;
}

function ConversationItem({
    conversation,
    selected,
    onSelect,
}: {
    conversation: Conversation;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent",
                selected && "bg-accent"
            )}>
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

            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <p className="flex min-w-0 items-center gap-1 truncate font-medium">
                        {conversation.favorite && conversation.type === "direct" && (
                            <HugeiconsIcon icon={StarIcon} fill="currentColor" className="size-3.5 shrink-0 text-primary" />
                        )}
                        <span className="truncate">{conversation.name}</span>
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                        {formatConversationTime(conversation.lastMessageAt)}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-muted-foreground">
                        {isRequest(conversation)
                            ? (conversation.lastMessage ?? "Wants to message you")
                            : (conversation.lastMessage ?? "No messages yet")}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                        {conversation.blocked && <Badge variant="outline">Blocked</Badge>}
                        {isRequest(conversation) && <Badge>Request</Badge>}
                        {conversation.pinned && (
                            <HugeiconsIcon icon={PinIcon} className="size-3.5 text-muted-foreground" />
                        )}
                    </div>
                </div>
            </div>
        </button>
    );
}

export function ChatsPanel({
    conversations,
    selectedId,
    loading,
    requestCount,
    onSelect,
    onNewChat,
    onNewGroup,
}: {
    conversations: Conversation[];
    selectedId: string | null;
    loading: boolean;
    requestCount: number;
    onSelect: (id: string) => void;
    onNewChat: () => void;
    onNewGroup: () => void;
}) {
    const [query, setQuery] = useState("");
    const [filter, setFilter] = useState<Filter>("All");

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();

        return conversations.filter((conversation) => {
            if (term && !conversation.name.toLowerCase().includes(term)) return false;
            if (filter === "Requests") return isRequest(conversation);
            if (filter === "Favourites") return conversation.favorite;
            if (filter === "Groups") return conversation.type === "group";
            if (filter === "Direct") return conversation.type === "direct";
            return true;
        });
    }, [conversations, query, filter]);

    const pinned = filtered.filter((conversation) => conversation.pinned);
    const rest = filtered.filter((conversation) => !conversation.pinned);

    return (
        <div className="flex min-h-0 w-full flex-1 flex-col gap-3 border-r bg-card p-4 md:w-[360px] md:flex-none md:shrink-0">
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-xl font-medium">Chats</h1>
                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger
                            render={
                                <Button size="icon-sm" variant="ghost" aria-label="New conversation" onClick={onNewChat} />
                            }>
                            <HugeiconsIcon icon={UserAdd01Icon} />
                        </TooltipTrigger>
                        <TooltipContent>New conversation</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger
                            render={<Button size="icon-sm" variant="ghost" aria-label="New group" onClick={onNewGroup} />}>
                            <HugeiconsIcon icon={UserGroupIcon} />
                        </TooltipTrigger>
                        <TooltipContent>New group</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            <InputGroup>
                <InputGroupAddon>
                    <HugeiconsIcon icon={Search01Icon} className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder="Search or start a new chat"
                />
            </InputGroup>

            <div className="flex flex-wrap gap-1">
                {FILTERS.map((item) => (
                    <Badge
                        key={item}
                        variant={filter === item ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setFilter(item)}>
                        {item}
                        {item === "Requests" && requestCount > 0 && ` ${requestCount}`}
                    </Badge>
                ))}
            </div>

            <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-1 pr-2">
                    {loading &&
                        conversations.length === 0 &&
                        [0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-14 rounded-lg" />)}

                    {!loading && filtered.length === 0 && (
                        <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                            {conversations.length === 0 ? "No conversations yet" : "Nothing matches that filter"}
                        </p>
                    )}

                    {pinned.length > 0 && (
                        <>
                            <p className="px-2 pt-2 text-xs font-medium text-muted-foreground">Pinned</p>
                            {pinned.map((conversation) => (
                                <ConversationItem
                                    key={conversation.id}
                                    conversation={conversation}
                                    selected={conversation.id === selectedId}
                                    onSelect={() => onSelect(conversation.id)}
                                />
                            ))}
                        </>
                    )}

                    {rest.length > 0 && (
                        <>
                            {pinned.length > 0 && (
                                <p className="px-2 pt-3 text-xs font-medium text-muted-foreground">All messages</p>
                            )}
                            {rest.map((conversation) => (
                                <ConversationItem
                                    key={conversation.id}
                                    conversation={conversation}
                                    selected={conversation.id === selectedId}
                                    onSelect={() => onSelect(conversation.id)}
                                />
                            ))}
                        </>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
