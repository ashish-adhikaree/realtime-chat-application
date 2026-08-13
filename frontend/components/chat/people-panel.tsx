"use client";

import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, StarIcon, UserAdd01Icon } from "@hugeicons/core-free-icons";
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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { initials } from "@/lib/format";
import type { Contact, PublicUser } from "@/lib/types";
import { cn } from "@/lib/utils";

function Row({
    person,
    subtitle,
    children,
}: {
    person: { name: string; username: string | null; image: string | null };
    subtitle?: string | null;
    children?: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent">
            <Avatar>
                <AvatarImage src={person.image ?? undefined} />
                <AvatarFallback>{initials(person.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{person.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                    {subtitle ?? (person.username ? `@${person.username}` : "No username")}
                </p>
            </div>
            {children}
        </div>
    );
}

export function ContactsPanel({
    onMessage,
    onChanged,
    onError,
    onSuccess,
    reloadKey,
}: {
    onMessage: (userId: string) => void;
    onChanged: () => void;
    onError: (message: string) => void;
    onSuccess: (message: string) => void;
    reloadKey: number;
}) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [results, setResults] = useState<PublicUser[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api.listContacts()
            .then(setContacts)
            .catch(() => setContacts([]))
            .finally(() => setLoading(false));
    }, [reloadKey]);

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

    const searching = query.trim().length >= 2;

    const { favorites, others } = useMemo(() => {
        const term = query.trim().toLowerCase();
        const list = searching
            ? contacts
            : contacts.filter(
                  (c) => !term || c.name.toLowerCase().includes(term) || (c.username ?? "").includes(term)
              );
        return {
            favorites: list.filter((c) => c.favorite),
            others: list.filter((c) => !c.favorite),
        };
    }, [contacts, query, searching]);

    async function act(action: () => Promise<unknown>, message: string) {
        setBusy(true);
        try {
            await action();
            setContacts(await api.listContacts());
            onChanged();
            onSuccess(message);
        } catch (error) {
            onError(error instanceof Error ? error.message : "Something went wrong");
        } finally {
            setBusy(false);
        }
    }

    function contactRow(contact: Contact) {
        return (
            <Row
                key={contact.id}
                person={contact}
                subtitle={contact.alias ? `${contact.realName} · @${contact.username ?? "unknown"}` : undefined}>
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={contact.favorite ? "Remove from favourites" : "Add to favourites"}
                    disabled={busy}
                    onClick={() =>
                        act(
                            () => api.updateContact(contact.id, { favorite: !contact.favorite }),
                            contact.favorite ? "Removed from favourites" : "Added to favourites"
                        )
                    }>
                    <HugeiconsIcon
                        icon={StarIcon}
                        fill={contact.favorite ? "currentColor" : "none"}
                        className={cn(contact.favorite && "text-primary")}
                    />
                </Button>

                <Button size="sm" variant="outline" disabled={busy} onClick={() => onMessage(contact.id)}>
                    Message
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={<Button size="icon-sm" variant="ghost" disabled={busy} aria-label="Manage contact" />}>
                        ···
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-44">
                        <DropdownMenuItem
                            onClick={() => act(() => api.removeContact(contact.id), `${contact.name} removed`)}>
                            Remove contact
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => act(() => api.blockUser(contact.id), `${contact.name} blocked`)}>
                            Block
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </Row>
        );
    }

    return (
        <div className="flex min-h-0 w-[360px] shrink-0 flex-col gap-3 border-r bg-card p-4">
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-xl font-medium">Contacts</h1>
                <span className="text-sm text-muted-foreground">{contacts.length}</span>
            </div>

            <InputGroup>
                <InputGroupAddon>
                    <HugeiconsIcon icon={Search01Icon} className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder="Search people by username"
                />
            </InputGroup>

            <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-1 pr-2">
                    {loading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}

                    {searching && (
                        <>
                            <p className="px-2 pt-1 text-xs font-medium text-muted-foreground">Search results</p>
                            {results.length === 0 && (
                                <p className="py-6 text-center text-sm text-muted-foreground">No users found</p>
                            )}
                            {results.map((person) => (
                                <Row key={person.id} person={person}>
                                    {person.isContact ? (
                                        <Badge variant="secondary">Contact</Badge>
                                    ) : (
                                        <Button
                                            size="icon-sm"
                                            variant="ghost"
                                            aria-label="Add contact"
                                            disabled={busy}
                                            onClick={() =>
                                                act(() => api.addContact(person.id), `${person.name} added`)
                                            }>
                                            <HugeiconsIcon icon={UserAdd01Icon} />
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={busy}
                                        onClick={() => onMessage(person.id)}>
                                        Message
                                    </Button>
                                </Row>
                            ))}
                        </>
                    )}

                    {!searching && !loading && contacts.length === 0 && (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            No contacts yet. Search by username to add someone.
                        </p>
                    )}

                    {!searching && favorites.length > 0 && (
                        <>
                            <p className="px-2 pt-1 text-xs font-medium text-muted-foreground">Favourites</p>
                            {favorites.map(contactRow)}
                        </>
                    )}

                    {!searching && others.length > 0 && (
                        <>
                            {favorites.length > 0 && (
                                <p className="px-2 pt-3 text-xs font-medium text-muted-foreground">All contacts</p>
                            )}
                            {others.map(contactRow)}
                        </>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

export function BlockedPanel({
    onChanged,
    onError,
    onSuccess,
    reloadKey,
}: {
    onChanged: () => void;
    onError: (message: string) => void;
    onSuccess: (message: string) => void;
    reloadKey: number;
}) {
    const [blocked, setBlocked] = useState<PublicUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        api.listBlocked()
            .then(setBlocked)
            .catch(() => setBlocked([]))
            .finally(() => setLoading(false));
    }, [reloadKey]);

    return (
        <div className="flex min-h-0 w-[360px] shrink-0 flex-col gap-3 border-r bg-card p-4">
            <div className="flex items-center justify-between gap-2">
                <h1 className="text-xl font-medium">Blocked</h1>
                <span className="text-sm text-muted-foreground">{blocked.length}</span>
            </div>

            <p className="text-sm text-muted-foreground">
                Blocked people cannot message you, and you cannot message them.
            </p>

            <ScrollArea className="min-h-0 flex-1">
                <div className="flex flex-col gap-1 pr-2">
                    {loading && [0, 1].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}

                    {!loading && blocked.length === 0 && (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            You have not blocked anyone.
                        </p>
                    )}

                    {blocked.map((person) => (
                        <Row key={person.id} person={person}>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={async () => {
                                    setBusy(true);
                                    try {
                                        setBlocked(await api.unblockUser(person.id));
                                        onChanged();
                                        onSuccess(`${person.name} unblocked`);
                                    } catch (error) {
                                        onError(error instanceof Error ? error.message : "Could not unblock");
                                    } finally {
                                        setBusy(false);
                                    }
                                }}>
                                Unblock
                            </Button>
                        </Row>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
