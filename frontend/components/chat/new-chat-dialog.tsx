"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, UserAdd01Icon } from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { initials } from "@/lib/format";
import type { Contact, PublicUser } from "@/lib/types";

function UserRow({
    user,
    actionLabel,
    onAction,
    onAddContact,
    busy,
}: {
    user: PublicUser;
    actionLabel: string;
    onAction: () => void;
    onAddContact?: () => void;
    busy: boolean;
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent">
            <Avatar>
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                    {user.username ? `@${user.username}` : "No username"}
                </p>
            </div>
            {user.isContact && <Badge variant="secondary">Contact</Badge>}
            {onAddContact && !user.isContact && (
                <Button size="icon-sm" variant="ghost" disabled={busy} onClick={onAddContact}>
                    <HugeiconsIcon icon={UserAdd01Icon} />
                </Button>
            )}
            <Button size="sm" variant="outline" disabled={busy} onClick={onAction}>
                {actionLabel}
            </Button>
        </div>
    );
}

export function NewChatDialog({
    open,
    onOpenChange,
    onStarted,
    onError,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStarted: (conversationId: string) => void;
    onError: (message: string) => void;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PublicUser[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [searching, setSearching] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        api.listContacts().then(setContacts).catch(() => setContacts([]));
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const term = query.trim();
        if (term.length < 2) {
            setResults([]);
            return;
        }

        setSearching(true);
        const timer = setTimeout(() => {
            api.searchUsers(term)
                .then(setResults)
                .catch(() => setResults([]))
                .finally(() => setSearching(false));
        }, 250);

        return () => clearTimeout(timer);
    }, [query, open]);

    async function startChat(userId: string) {
        setBusy(true);
        try {
            const { id } = await api.createDirect(userId);
            onStarted(id);
            onOpenChange(false);
            setQuery("");
        } catch (error) {
            onError(error instanceof Error ? error.message : "Could not start the conversation");
        } finally {
            setBusy(false);
        }
    }

    async function addContact(userId: string) {
        setBusy(true);
        try {
            setContacts(await api.addContact(userId));
            setResults((current) =>
                current.map((user) => (user.id === userId ? { ...user, isContact: true } : user))
            );
        } catch (error) {
            onError(error instanceof Error ? error.message : "Could not add contact");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>New conversation</DialogTitle>
                    <DialogDescription>Find someone by username, or pick from your contacts.</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="search">
                    <TabsList className="w-full">
                        <TabsTrigger value="search">Search</TabsTrigger>
                        <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="search" className="flex flex-col gap-3">
                        <InputGroup>
                            <InputGroupAddon>
                                <HugeiconsIcon icon={Search01Icon} className="size-4" />
                            </InputGroupAddon>
                            <InputGroupInput
                                autoFocus
                                value={query}
                                onChange={(event) => setQuery(event.currentTarget.value)}
                                placeholder="Search by username or name"
                            />
                        </InputGroup>

                        <ScrollArea className="h-72">
                            <div className="flex flex-col gap-1 pr-2">
                                {searching && <Skeleton className="h-14 rounded-lg" />}
                                {!searching && query.trim().length >= 2 && results.length === 0 && (
                                    <p className="py-8 text-center text-sm text-muted-foreground">No users found</p>
                                )}
                                {query.trim().length < 2 && (
                                    <p className="py-8 text-center text-sm text-muted-foreground">
                                        Type at least 2 characters
                                    </p>
                                )}
                                {results.map((user) => (
                                    <UserRow
                                        key={user.id}
                                        user={user}
                                        actionLabel="Message"
                                        busy={busy}
                                        onAction={() => startChat(user.id)}
                                        onAddContact={() => addContact(user.id)}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="contacts">
                        <ScrollArea className="h-80">
                            <div className="flex flex-col gap-1 pr-2">
                                {contacts.length === 0 && (
                                    <p className="py-8 text-center text-sm text-muted-foreground">
                                        No contacts yet. Add someone from search.
                                    </p>
                                )}
                                {contacts.map((contact) => (
                                    <UserRow
                                        key={contact.id}
                                        user={contact}
                                        actionLabel="Message"
                                        busy={busy}
                                        onAction={() => startChat(contact.id)}
                                    />
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
