import { HugeiconsIcon } from "@hugeicons/react";
import {
    Call02Icon,
    ComputerVideoCallIcon,
    MoreVerticalIcon,
} from "@hugeicons/core-free-icons";
import {
    Avatar,
    AvatarFallback,
    AvatarGroup,
    AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";

function statusLabel(conversation: Conversation) {
    if (conversation.typing) return "Typing...";
    if (conversation.online) return "Online";
    return "Offline";
}

export function ChatHeader({ conversation }: { conversation: Conversation }) {
    return (
        <header className="bg-card px-4 py-2">
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={conversation.avatar} />
                    <AvatarFallback>{conversation.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="font-medium">{conversation.name}</p>
                    <p
                        className={cn(
                            "text-sm",
                            conversation.typing ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        {statusLabel(conversation)}
                    </p>
                </div>
                {conversation.isGroup && conversation.memberAvatars && (
                    <AvatarGroup>
                        {conversation.memberAvatars.slice(0, 4).map((src) => (
                            <Avatar key={src} size="sm">
                                <AvatarImage src={src} />
                            </Avatar>
                        ))}
                    </AvatarGroup>
                )}
                <TooltipProvider>
                    <div className="flex items-center gap-1">
                        <Tooltip>
                            <TooltipTrigger render={<Button size="icon-sm" variant="ghost" />}>
                                <HugeiconsIcon icon={Call02Icon} />
                            </TooltipTrigger>
                            <TooltipContent>Call</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger render={<Button size="icon-sm" variant="ghost" />}>
                                <HugeiconsIcon icon={ComputerVideoCallIcon} />
                            </TooltipTrigger>
                            <TooltipContent>Video call</TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" />}>
                                <HugeiconsIcon icon={MoreVerticalIcon} />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem>View contact</DropdownMenuItem>
                                <DropdownMenuItem>Mute notifications</DropdownMenuItem>
                                <DropdownMenuItem variant="destructive">
                                    Clear chat
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </TooltipProvider>
            </div>
        </header>
    );
}
