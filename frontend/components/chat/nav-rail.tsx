"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
    BubbleChatIcon,
    MoreVerticalIcon,
    Settings01Icon,
    UserBlock01Icon,
    UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { initials } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Panel = "chats" | "contacts" | "blocked";

const ITEMS: { id: Panel; label: string; icon: typeof BubbleChatIcon }[] = [
    { id: "chats", label: "Chats", icon: BubbleChatIcon },
    { id: "contacts", label: "Contacts", icon: UserGroupIcon },
    { id: "blocked", label: "Blocked", icon: UserBlock01Icon },
];

export function NavRail({
    panel,
    onPanelChange,
    profile,
    requestCount,
    connected,
    onOpenSettings,
    onSignOut,
    signingOut,
    hidden,
}: {
    hidden?: boolean;
    panel: Panel;
    onPanelChange: (panel: Panel) => void;
    profile: Profile;
    requestCount: number;
    connected: boolean;
    onOpenSettings: () => void;
    onSignOut: () => void;
    signingOut: boolean;
}) {
    return (
        <nav
            className={cn(
                "order-last flex w-full shrink-0 flex-row items-center justify-around gap-2 border-t bg-card px-2 py-2",
                "md:order-first md:h-full md:w-16 md:flex-col md:justify-start md:border-t-0 md:border-r md:px-0 md:py-3",
                hidden && "hidden md:flex"
            )}>
            {ITEMS.map((item) => (
                <Tooltip key={item.id}>
                    <TooltipTrigger
                        render={
                            <Button
                                size="icon"
                                variant={panel === item.id ? "secondary" : "ghost"}
                                aria-label={item.label}
                                aria-current={panel === item.id}
                                onClick={() => onPanelChange(item.id)}
                                className="relative"
                            />
                        }>
                        <HugeiconsIcon icon={item.icon} />
                        {item.id === "chats" && requestCount > 0 && (
                            <Badge className="absolute -right-0.5 -top-0.5 size-4 justify-center rounded-full p-0 text-[10px]">
                                {requestCount}
                            </Badge>
                        )}
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
            ))}

            <div className="flex flex-row items-center gap-2 md:mt-auto md:flex-col">
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <Button size="icon" variant="ghost" aria-label="Settings" onClick={onOpenSettings} />
                        }>
                        <HugeiconsIcon icon={Settings01Icon} />
                    </TooltipTrigger>
                    <TooltipContent side="right">Settings</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={<Button size="icon" variant="ghost" aria-label="Account menu" className="rounded-full" />}>
                        <Avatar size="sm">
                            <AvatarImage src={profile.image ?? undefined} />
                            <AvatarFallback>{initials(profile.name)}</AvatarFallback>
                        </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="end" className="min-w-56">
                        <div className="px-2 py-1.5">
                            <p className="truncate text-sm font-medium">{profile.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                                {profile.username ? `@${profile.username}` : "Set a username"}
                            </p>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onOpenSettings} className="whitespace-nowrap">
                            <HugeiconsIcon icon={Settings01Icon} className="size-4" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            disabled={signingOut}
                            onClick={onSignOut}
                            className="whitespace-nowrap">
                            <HugeiconsIcon icon={MoreVerticalIcon} className="size-4 opacity-0" />
                            {signingOut ? "Signing out..." : "Sign out"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </nav>
    );
}
