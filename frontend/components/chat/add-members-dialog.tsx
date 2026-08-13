"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FieldDescription, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { initials } from "@/lib/format";
import type { Contact, ConversationDetail, PublicUser } from "@/lib/types";

export function AddMembersDialog({
    open,
    onOpenChange,
    conversationId,
    existingIds,
    onAdded,
    onError,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conversationId: string;
    existingIds: Set<string>;
    onAdded: (detail: ConversationDetail, count: number) => void;
    onError: (message: string) => void;
}) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [results, setResults] = useState<PublicUser[]>([]);
    const [selected, setSelected] = useState<PublicUser[]>([]);
    const [query, setQuery] = useState("");
    const [history, setHistory] = useState("since");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setSelected([]);
        setQuery("");
        setHistory("since");
        api.listContacts().then(setContacts).catch(() => setContacts([]));
    }, [open]);

    useEffect(() => {
        const term = query.trim();
        if (term.length < 2) {
            setResults([]);
            return;
        }

        const timer = setTimeout(() => {
            api.searchUsers(term).then(setResults).catch(() => setResults([]));
        }, 250);

        return () => clearTimeout(timer);
    }, [query]);

    const candidates = (query.trim().length >= 2 ? results : contacts).filter(
        (person) => !existingIds.has(person.id)
    );
    const selectedIds = new Set(selected.map((person) => person.id));

    async function submit() {
        if (selected.length === 0) return;

        setBusy(true);
        try {
            const detail = await api.addMembers(
                conversationId,
                selected.map((person) => person.id),
                history === "all"
            );
            onAdded(detail, selected.length);
            onOpenChange(false);
        } catch (error) {
            onError(error instanceof Error ? error.message : "Could not add members");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add people</DialogTitle>
                    <DialogDescription>Pick who to add, then choose what history they can see.</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    {selected.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {selected.map((person) => (
                                <Badge key={person.id} variant="secondary" className="gap-1">
                                    {person.name}
                                    <button
                                        type="button"
                                        aria-label={`Remove ${person.name}`}
                                        onClick={() =>
                                            setSelected((current) => current.filter((x) => x.id !== person.id))
                                        }>
                                        <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}

                    <InputGroup>
                        <InputGroupAddon>
                            <HugeiconsIcon icon={Search01Icon} className="size-4" />
                        </InputGroupAddon>
                        <InputGroupInput
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.currentTarget.value)}
                            placeholder="Search contacts or usernames"
                        />
                    </InputGroup>

                    <ScrollArea className="h-56">
                        <div className="flex flex-col gap-1 pr-2">
                            {candidates.length === 0 && (
                                <p className="py-10 text-center text-sm text-muted-foreground">
                                    {query.trim().length >= 2
                                        ? "No one new matches that search"
                                        : "Everyone in your contacts is already here"}
                                </p>
                            )}
                            {candidates.map((person) => (
                                <button
                                    key={person.id}
                                    type="button"
                                    onClick={() =>
                                        setSelected((current) =>
                                            selectedIds.has(person.id)
                                                ? current.filter((x) => x.id !== person.id)
                                                : [...current, person]
                                        )
                                    }
                                    className="flex items-center gap-3 rounded-lg p-2 text-left hover:bg-accent">
                                    <Avatar>
                                        <AvatarImage src={person.image ?? undefined} />
                                        <AvatarFallback>{initials(person.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{person.name}</p>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {person.username ? `@${person.username}` : "No username"}
                                        </p>
                                    </div>
                                    {selectedIds.has(person.id) && <Badge>Selected</Badge>}
                                </button>
                            ))}
                        </div>
                    </ScrollArea>

                    <Separator />

                    <div className="flex flex-col gap-2">
                        <FieldLabel>What can they see?</FieldLabel>
                        <RadioGroup value={history} onValueChange={setHistory}>
                            <div className="flex items-start gap-2">
                                <RadioGroupItem value="since" id="add-history-since" />
                                <div>
                                    <FieldLabel htmlFor="add-history-since" className="font-normal">
                                        Only messages from now on
                                    </FieldLabel>
                                    <FieldDescription>Earlier messages stay private.</FieldDescription>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <RadioGroupItem value="all" id="add-history-all" />
                                <div>
                                    <FieldLabel htmlFor="add-history-all" className="font-normal">
                                        The full conversation history
                                    </FieldLabel>
                                    <FieldDescription>They can scroll back through everything.</FieldDescription>
                                </div>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button disabled={selected.length === 0 || busy} onClick={() => void submit()}>
                        {busy ? "Adding..." : `Add ${selected.length || ""}`.trim()}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
