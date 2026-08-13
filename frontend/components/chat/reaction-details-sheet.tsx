"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { initials } from "@/lib/format";
import type { Reaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ReactionDetailsSheet({
    open,
    onOpenChange,
    reactions,
    currentUserId,
    onRemoveOwn,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reactions: Reaction[];
    currentUserId: string;
    onRemoveOwn: () => void;
}) {
    const [filter, setFilter] = useState<string | null>(null);

    const total = reactions.reduce((sum, reaction) => sum + reaction.count, 0);
    const visible = filter ? reactions.filter((reaction) => reaction.emoji === filter) : reactions;

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                if (!next) setFilter(null);
                onOpenChange(next);
            }}>
            <SheetContent className="w-full sm:max-w-sm">
                <SheetHeader>
                    <SheetTitle>Reactions</SheetTitle>
                    <SheetDescription>
                        {total} {total === 1 ? "reaction" : "reactions"} on this message
                    </SheetDescription>
                </SheetHeader>

                <div className="flex flex-col gap-4 px-4 pb-6">
                    <div className="flex flex-wrap gap-1">
                        <Button
                            size="sm"
                            variant={filter === null ? "secondary" : "ghost"}
                            onClick={() => setFilter(null)}>
                            All {total}
                        </Button>
                        {reactions.map((reaction) => (
                            <Button
                                key={reaction.emoji}
                                size="sm"
                                variant={filter === reaction.emoji ? "secondary" : "ghost"}
                                onClick={() => setFilter(reaction.emoji)}>
                                <span>{reaction.emoji}</span>
                                <span className="tabular-nums">{reaction.count}</span>
                            </Button>
                        ))}
                    </div>

                    <ScrollArea className="max-h-96">
                        <div className="flex flex-col gap-1 pr-2">
                            {visible.flatMap((reaction) =>
                                reaction.users.map((person) => (
                                    <div
                                        key={`${reaction.emoji}-${person.id}`}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg p-2",
                                            person.id === currentUserId && "bg-accent"
                                        )}>
                                        <Avatar size="sm">
                                            <AvatarImage src={person.image ?? undefined} />
                                            <AvatarFallback>{initials(person.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {person.name}
                                                {person.id === currentUserId && " (you)"}
                                            </p>
                                            {person.id === currentUserId && (
                                                <p className="text-xs text-muted-foreground">Tap remove to undo</p>
                                            )}
                                        </div>
                                        <span className="text-lg">{reaction.emoji}</span>
                                        {person.id === currentUserId && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    onRemoveOwn();
                                                    onOpenChange(false);
                                                }}>
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </SheetContent>
        </Sheet>
    );
}
