import { HugeiconsIcon } from "@hugeicons/react";
import { AddMaleIcon, PinIcon, Search01Icon, Tick01Icon, TickDouble01Icon } from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/types";

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
                selected && "bg-accent",
            )}>
            <Avatar>
                <AvatarImage src={conversation.avatar} />
                <AvatarFallback>{conversation.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{conversation.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{conversation.lastMessageTime}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-muted-foreground">
                        {conversation.typing ? "Typing..." : conversation.lastMessage}
                    </p>
                    {conversation.unreadCount > 0 ? (
                        <Badge className="h-5 min-w-5 justify-center rounded-full px-1 tabular-nums">
                            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                        </Badge>
                    ) : (
                        conversation.lastMessageIsOwn &&
                        conversation.lastMessageStatus && (
                            <HugeiconsIcon
                                icon={conversation.lastMessageStatus === "sent" ? Tick01Icon : TickDouble01Icon}
                                className={cn(
                                    "size-4 shrink-0 text-muted-foreground",
                                    conversation.lastMessageStatus === "read" && "text-primary",
                                )}
                            />
                        )
                    )}
                </div>
            </div>
        </button>
    );
}

export function ConversationList({
    conversations,
    selectedId,
    onSelect,
}: {
    conversations: Conversation[];
    selectedId: string;
    onSelect: (id: string) => void;
}) {
    const pinned = conversations.filter((c) => c.pinned);
    const rest = conversations.filter((c) => !c.pinned);

    return (
        <div className="flex h-full flex-col gap-3">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">GufGaaf</h1>
                <Button size="icon" variant="secondary">
                    <HugeiconsIcon icon={AddMaleIcon} />
                </Button>
            </div>
            <div className="space-y-2">
                <InputGroup>
                    <InputGroupAddon>
                        <InputGroupButton size="icon-sm" variant="ghost">
                            <HugeiconsIcon icon={Search01Icon} />
                        </InputGroupButton>
                    </InputGroupAddon>
                    <InputGroupInput className="py-3" placeholder="Search" />
                </InputGroup>

                <div className="flex items-center gap-2 flex-wrap">
                    {["All", "Groups", "Friends"].map((item, index) => (
                        <Button size="sm" variant={index === 0 ? "default" : "outline"} key={item}>
                            {item}
                        </Button>
                    ))}
                </div>
            </div>
            <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-4 pr-2">
                    {pinned.length > 0 && (
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground">
                                <HugeiconsIcon icon={PinIcon} className="size-3.5" />
                                Pinned
                            </div>
                            {pinned.map((conversation) => (
                                <ConversationItem
                                    key={conversation.id}
                                    conversation={conversation}
                                    selected={conversation.id === selectedId}
                                    onSelect={() => onSelect(conversation.id)}
                                />
                            ))}
                        </div>
                    )}
                    <div className="space-y-1">
                        <div className="px-2 text-xs font-medium text-muted-foreground">All Messages</div>
                        {rest.map((conversation) => (
                            <ConversationItem
                                key={conversation.id}
                                conversation={conversation}
                                selected={conversation.id === selectedId}
                                onSelect={() => onSelect(conversation.id)}
                            />
                        ))}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
}
