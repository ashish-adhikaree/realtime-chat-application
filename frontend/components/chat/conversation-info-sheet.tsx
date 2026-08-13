"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit02Icon, StarIcon, UserAdd01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { AddMembersDialog } from "@/components/chat/add-members-dialog";
import { api, uploadFile } from "@/lib/api";
import { initials } from "@/lib/format";
import type { ConversationDetail } from "@/lib/types";

export function ConversationInfoSheet({
    open,
    onOpenChange,
    detail,
    currentUserId,
    blocked,
    onChanged,
    onLeave,
    onToggleBlock,
    onError,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    detail: ConversationDetail | null;
    currentUserId: string;
    blocked: boolean;
    onChanged: (detail: ConversationDetail) => void;
    onLeave: () => void;
    onToggleBlock: () => void;
    onError: (message: string) => void;
    onSuccess: (message: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [addOpen, setAddOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const isGroup = detail?.type === "group";
    const activeMembers = detail?.members.filter((member) => member.active) ?? [];
    const isAdmin = activeMembers.find((member) => member.id === currentUserId)?.role === "admin";
    const canEditInfo = isGroup && (isAdmin || detail?.onlyAdminsCanEditInfo === false);
    const canAddMembers = isGroup && (isAdmin || detail?.onlyAdminsCanAddMembers === false);

    useEffect(() => {
        setName(detail?.name ?? "");
        setDescription(detail?.description ?? "");
        setEditing(false);
    }, [detail, open]);

    async function run(action: () => Promise<ConversationDetail>, message: string) {
        setBusy(true);
        try {
            onChanged(await action());
            onSuccess(message);
        } catch (error) {
            onError(error instanceof Error ? error.message : "Something went wrong");
        } finally {
            setBusy(false);
        }
    }

    async function saveInfo() {
        await run(
            () =>
                api.updateGroup(detail!.id, {
                    name: name.trim(),
                    description: description.trim() || null,
                }),
            "Group updated"
        );
        setEditing(false);
    }

    if (!detail) return null;

    const dirty = name.trim() !== detail.name || (description.trim() || null) !== (detail.description ?? null);

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>{isGroup ? "Group info" : "Contact info"}</SheetTitle>
                        <SheetDescription>
                            {isGroup ? `${activeMembers.length} members` : "Direct conversation"}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex flex-col gap-6 px-4 pb-6">
                        <div className="flex flex-col items-center gap-3">
                            <Avatar className="size-24">
                                <AvatarImage src={detail.image ?? undefined} />
                                <AvatarFallback>
                                    {isGroup ? (
                                        <HugeiconsIcon icon={UserGroupIcon} className="size-9" />
                                    ) : (
                                        initials(detail.name)
                                    )}
                                </AvatarFallback>
                            </Avatar>

                            {!editing && (
                                <div className="flex flex-col items-center gap-1 text-center">
                                    <p className="text-lg font-medium">{detail.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {detail.description || (isGroup ? "No description yet" : "")}
                                    </p>
                                </div>
                            )}

                            {!editing && canEditInfo && (
                                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                                    <HugeiconsIcon icon={Edit02Icon} className="size-4" />
                                    Edit
                                </Button>
                            )}
                        </div>

                        {editing && canEditInfo && (
                            <div className="flex flex-col gap-4">
                                <Field>
                                    <FieldLabel htmlFor="group-name-edit">Group name</FieldLabel>
                                    <Input
                                        id="group-name-edit"
                                        value={name}
                                        onChange={(event) => setName(event.currentTarget.value)}
                                    />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="group-description-edit">Description</FieldLabel>
                                    <Textarea
                                        id="group-description-edit"
                                        rows={3}
                                        value={description}
                                        onChange={(event) => setDescription(event.currentTarget.value)}
                                        placeholder="What is this group about?"
                                    />
                                </Field>

                                <Field>
                                    <FieldLabel htmlFor="group-image-edit">Group image</FieldLabel>
                                    <Input
                                        id="group-image-edit"
                                        type="file"
                                        accept="image/*"
                                        disabled={busy}
                                        onChange={async (event) => {
                                            const file = event.currentTarget.files?.[0];
                                            if (!file) return;
                                            setBusy(true);
                                            try {
                                                const imageKey = await uploadFile("group-image", file);
                                                onChanged(await api.updateGroup(detail.id, { imageKey }));
                                                onSuccess("Group image updated");
                                            } catch (error) {
                                                onError(
                                                    error instanceof Error ? error.message : "Could not upload image"
                                                );
                                            } finally {
                                                setBusy(false);
                                            }
                                        }}
                                    />
                                </Field>

                                <div className="flex gap-2">
                                    <Button disabled={busy || !name.trim() || !dirty} onClick={() => void saveInfo()}>
                                        Save changes
                                    </Button>
                                    <Button
                                        variant="outline"
                                        disabled={busy}
                                        onClick={() => {
                                            setName(detail.name);
                                            setDescription(detail.description ?? "");
                                            setEditing(false);
                                        }}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}

                        <Separator />

                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2 px-1">
                                <p className="text-sm font-medium">
                                    {isGroup ? `${activeMembers.length} members` : "Participants"}
                                </p>
                                {canAddMembers && (
                                    <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                                        <HugeiconsIcon icon={UserAdd01Icon} className="size-4" />
                                        Add people
                                    </Button>
                                )}
                            </div>

                            <ScrollArea className="max-h-80">
                                <div className="flex flex-col gap-1 pr-2">
                                    {activeMembers.map((member) => (
                                        <div key={member.id} className="flex items-center gap-3 rounded-lg p-2">
                                            <Avatar size="sm">
                                                <AvatarImage src={member.image ?? undefined} />
                                                <AvatarFallback>{initials(member.name)}</AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <p className="flex items-center gap-1 truncate text-sm font-medium">
                                                    {member.favorite && (
                                                        <HugeiconsIcon
                                                            icon={StarIcon}
                                                            className="size-3.5 shrink-0 text-primary"
                                                        />
                                                    )}
                                                    <span className="truncate">
                                                        {member.name}
                                                        {member.id === currentUserId && " (you)"}
                                                    </span>
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {member.username ? `@${member.username}` : "No username"}
                                                </p>
                                            </div>

                                            {member.isContact && member.id !== currentUserId && (
                                                <Badge variant="outline">Contact</Badge>
                                            )}
                                            {member.role === "admin" && <Badge variant="secondary">Admin</Badge>}

                                            {isGroup && isAdmin && member.id !== currentUserId && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        render={
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                disabled={busy}
                                                                aria-label={`Manage ${member.name}`}
                                                            />
                                                        }>
                                                        Manage
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="min-w-48">
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                run(
                                                                    () =>
                                                                        api.updateMemberRole(
                                                                            detail.id,
                                                                            member.id,
                                                                            member.role === "admin"
                                                                                ? "member"
                                                                                : "admin"
                                                                        ),
                                                                    "Role updated"
                                                                )
                                                            }>
                                                            {member.role === "admin"
                                                                ? "Demote to member"
                                                                : "Make admin"}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            onClick={() =>
                                                                run(
                                                                    () => api.removeMember(detail.id, member.id),
                                                                    `${member.name} removed`
                                                                )
                                                            }>
                                                            Remove from group
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        <Separator />

                        {isGroup ? (
                            <Button variant="outline" disabled={busy} onClick={onLeave} className="text-destructive">
                                Leave group
                            </Button>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="outline"
                                    disabled={busy}
                                    onClick={onToggleBlock}
                                    className={blocked ? undefined : "text-destructive"}>
                                    {blocked ? "Unblock user" : "Block user"}
                                </Button>
                                <FieldDescription>
                                    {blocked
                                        ? "You can still read this conversation. Unblock to send messages again."
                                        : "Blocking stops messages in both directions."}
                                </FieldDescription>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <AddMembersDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                conversationId={detail.id}
                existingIds={new Set(activeMembers.map((member) => member.id))}
                onAdded={(updated, count) => {
                    onChanged(updated);
                    onSuccess(`${count} ${count === 1 ? "person" : "people"} added`);
                }}
                onError={onError}
            />
        </>
    );
}
