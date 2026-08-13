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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, uploadFile } from "@/lib/api";
import { initials } from "@/lib/format";
import type { Contact, PublicUser } from "@/lib/types";

export function NewGroupDialog({
    open,
    onOpenChange,
    onCreated,
    onError,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (conversationId: string) => void;
    onError: (message: string) => void;
}) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [query, setQuery] = useState("");
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [results, setResults] = useState<PublicUser[]>([]);
    const [selected, setSelected] = useState<PublicUser[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!open) return;
        setName("");
        setDescription("");
        setQuery("");
        setSelected([]);
        setImageFile(null);
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

    const candidates = query.trim().length >= 2 ? results : contacts;
    const selectedIds = new Set(selected.map((user) => user.id));

    async function create() {
        if (!name.trim()) return;

        setCreating(true);
        try {
            const imageKey = imageFile ? await uploadFile("group-image", imageFile) : null;
            const { id } = await api.createGroup({
                name: name.trim(),
                description: description.trim() || null,
                imageKey,
                memberIds: selected.map((user) => user.id),
            });
            onCreated(id);
            onOpenChange(false);
        } catch (error) {
            onError(error instanceof Error ? error.message : "Could not create the group");
        } finally {
            setCreating(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>New group</DialogTitle>
                    <DialogDescription>Name the group and add people to it.</DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <Field>
                        <FieldLabel htmlFor="group-name">Group name</FieldLabel>
                        <Input
                            id="group-name"
                            value={name}
                            onChange={(event) => setName(event.currentTarget.value)}
                            placeholder="Trekking Buddies"
                        />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="group-description">Description</FieldLabel>
                        <Textarea
                            id="group-description"
                            rows={2}
                            value={description}
                            onChange={(event) => setDescription(event.currentTarget.value)}
                            placeholder="What is this group about? (optional)"
                        />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor="group-image">Group image</FieldLabel>
                        <Input
                            id="group-image"
                            type="file"
                            accept="image/*"
                            onChange={(event) => setImageFile(event.currentTarget.files?.[0] ?? null)}
                        />
                    </Field>

                    {selected.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {selected.map((user) => (
                                <Badge key={user.id} variant="secondary" className="gap-1">
                                    {user.name}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelected((current) => current.filter((item) => item.id !== user.id))
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
                            value={query}
                            onChange={(event) => setQuery(event.currentTarget.value)}
                            placeholder="Search people to add"
                        />
                    </InputGroup>

                    <ScrollArea className="h-56">
                        <div className="flex flex-col gap-1 pr-2">
                            {candidates.length === 0 && (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    {query.trim().length >= 2 ? "No users found" : "No contacts to show"}
                                </p>
                            )}
                            {candidates.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() =>
                                        setSelected((current) =>
                                            selectedIds.has(user.id)
                                                ? current.filter((item) => item.id !== user.id)
                                                : [...current, user]
                                        )
                                    }
                                    className="flex items-center gap-3 rounded-lg p-2 text-left hover:bg-accent">
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
                                    {selectedIds.has(user.id) && <Badge>Added</Badge>}
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button disabled={!name.trim() || creating} onClick={() => void create()}>
                        {creating ? "Creating..." : "Create group"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
