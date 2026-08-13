"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { api, uploadFile } from "@/lib/api";
import { initials } from "@/lib/format";
import type { NonContactPolicy, Profile } from "@/lib/types";

const POLICIES: { value: NonContactPolicy; label: string; description: string }[] = [
    {
        value: "everyone",
        label: "Anyone can message me",
        description: "Messages from people outside your contacts arrive normally.",
    },
    {
        value: "request",
        label: "Hold messages until I reply",
        description: "You see their first message only. The rest stay hidden until you reply.",
    },
    {
        value: "nobody",
        label: "Contacts only",
        description: "People outside your contacts cannot start a conversation with you.",
    },
];

export function SettingsDialog({
    open,
    onOpenChange,
    profile,
    onProfileChange,
    onError,
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    profile: Profile;
    onProfileChange: (profile: Profile) => void;
    onError: (message: string) => void;
    onSuccess: (message: string) => void;
}) {
    const [name, setName] = useState(profile.name);
    const [username, setUsername] = useState(profile.username ?? "");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setName(profile.name);
        setUsername(profile.username ?? "");
    }, [profile, open]);

    async function saveName() {
        setBusy(true);
        try {
            onProfileChange(await api.updateProfile({ name: name.trim() }));
            onSuccess("Name updated");
        } catch (error) {
            onError(error instanceof Error ? error.message : "Could not update your name");
        } finally {
            setBusy(false);
        }
    }

    async function saveUsername() {
        setBusy(true);
        try {
            const { error } = await authClient.updateUser({ username: username.trim() });
            if (error) throw new Error(error.message ?? "Could not update username");
            onProfileChange(await api.getProfile());
            onSuccess("Username updated");
        } catch (error) {
            onError(error instanceof Error ? error.message : "Could not update username");
        } finally {
            setBusy(false);
        }
    }

    async function changeAvatar(file: File) {
        setBusy(true);
        try {
            const objectKey = await uploadFile("avatar", file);
            onProfileChange(await api.setAvatar(objectKey));
            onSuccess("Profile picture updated");
        } catch (error) {
            onError(error instanceof Error ? error.message : "Could not upload the image");
        } finally {
            setBusy(false);
        }
    }

    async function updateSettings(input: {
        nonContactPolicy?: NonContactPolicy;
        allowGroupInvitesFromNonContacts?: boolean;
    }) {
        setBusy(true);
        try {
            onProfileChange(await api.updateSettings(input));
            onSuccess("Settings saved");
        } catch (error) {
            onError(error instanceof Error ? error.message : "Could not save settings");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>Manage your profile and who can reach you.</DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="profile">
                    <TabsList className="w-full">
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="privacy">Privacy</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <Avatar className="size-16">
                                <AvatarImage src={profile.image ?? undefined} />
                                <AvatarFallback>{initials(profile.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col gap-2">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    disabled={busy}
                                    onChange={(event) => {
                                        const file = event.currentTarget.files?.[0];
                                        if (file) void changeAvatar(file);
                                    }}
                                />
                                {profile.hasCustomAvatar && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={busy}
                                        onClick={async () => {
                                            setBusy(true);
                                            try {
                                                onProfileChange(await api.setAvatar(null));
                                                onSuccess("Profile picture removed");
                                            } catch (error) {
                                                onError(
                                                    error instanceof Error ? error.message : "Could not remove image"
                                                );
                                            } finally {
                                                setBusy(false);
                                            }
                                        }}>
                                        Remove photo
                                    </Button>
                                )}
                            </div>
                        </div>

                        <Field>
                            <FieldLabel htmlFor="settings-name">Display name</FieldLabel>
                            <div className="flex gap-2">
                                <Input
                                    id="settings-name"
                                    value={name}
                                    onChange={(event) => setName(event.currentTarget.value)}
                                />
                                <Button disabled={busy || !name.trim() || name === profile.name} onClick={saveName}>
                                    Save
                                </Button>
                            </div>
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="settings-username">Username</FieldLabel>
                            <div className="flex gap-2">
                                <Input
                                    id="settings-username"
                                    value={username}
                                    onChange={(event) => setUsername(event.currentTarget.value)}
                                    placeholder="ashish"
                                />
                                <Button
                                    disabled={busy || !username.trim() || username === profile.username}
                                    onClick={saveUsername}>
                                    Save
                                </Button>
                            </div>
                            <FieldDescription>
                                Letters, numbers and underscores. People find you by this.
                            </FieldDescription>
                        </Field>

                        <Field>
                            <FieldLabel>Email</FieldLabel>
                            <Input value={profile.email} readOnly disabled />
                        </Field>
                    </TabsContent>

                    <TabsContent value="privacy" className="flex flex-col gap-4">
                        <Field>
                            <FieldLabel>Messages from people outside your contacts</FieldLabel>
                        </Field>

                        <RadioGroup
                            value={profile.settings.nonContactPolicy}
                            onValueChange={(value) => void updateSettings({ nonContactPolicy: value as NonContactPolicy })}>
                            {POLICIES.map((policy) => (
                                <div key={policy.value} className="flex items-start gap-3 rounded-lg p-2">
                                    <RadioGroupItem value={policy.value} id={`policy-${policy.value}`} disabled={busy} />
                                    <div className="flex flex-col gap-0.5">
                                        <FieldLabel htmlFor={`policy-${policy.value}`} className="font-normal">
                                            {policy.label}
                                        </FieldLabel>
                                        <FieldDescription>{policy.description}</FieldDescription>
                                    </div>
                                </div>
                            ))}
                        </RadioGroup>

                        <Separator />

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-0.5">
                                <FieldLabel htmlFor="group-invites">Group invites from non-contacts</FieldLabel>
                                <FieldDescription>
                                    Let people outside your contacts add you to groups.
                                </FieldDescription>
                            </div>
                            <Switch
                                id="group-invites"
                                checked={profile.settings.allowGroupInvitesFromNonContacts}
                                disabled={busy}
                                onCheckedChange={(checked) =>
                                    void updateSettings({ allowGroupInvitesFromNonContacts: checked })
                                }
                            />
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
