"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatsPanel } from "@/components/chat/chats-panel";
import { Composer } from "@/components/chat/composer";
import { ConversationInfoSheet } from "@/components/chat/conversation-info-sheet";
import { MessageThread } from "@/components/chat/message-thread";
import { NavRail, type Panel } from "@/components/chat/nav-rail";
import { NewChatDialog } from "@/components/chat/new-chat-dialog";
import { NewGroupDialog } from "@/components/chat/new-group-dialog";
import { BlockedPanel, ContactsPanel } from "@/components/chat/people-panel";
import { SettingsDialog } from "@/components/chat/settings-dialog";
import { Button } from "@/components/ui/button";
import { api, uploadFile } from "@/lib/api";
import { signOut } from "@/lib/auth-client";
import { useRealtime } from "@/lib/use-realtime";
import type { Conversation, ConversationDetail, Message, MessageRequest, Profile } from "@/lib/types";

function attachmentType(files: File[]) {
    const first = files[0];
    if (!first) return "text" as const;
    if (first.type.startsWith("image/")) return "image" as const;
    if (first.type.startsWith("video/")) return "video" as const;
    if (first.type.startsWith("audio/")) return "audio" as const;
    return "file" as const;
}

export function ChatView({ profile: initialProfile }: { profile: Profile }) {
    const router = useRouter();

    const [profile, setProfile] = useState(initialProfile);
    const [panel, setPanel] = useState<Panel>("chats");
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<ConversationDetail | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [nextCursor, setNextCursor] = useState<number | null>(null);
    const [requests, setRequests] = useState<MessageRequest[]>([]);
    const [peopleKey, setPeopleKey] = useState(0);

    const [loadingConversations, setLoadingConversations] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [sending, setSending] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [connected, setConnected] = useState(false);

    const [newChatOpen, setNewChatOpen] = useState(false);
    const [newGroupOpen, setNewGroupOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);

    const selectedIdRef = useRef<string | null>(null);
    selectedIdRef.current = selectedId;

    const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;

    const fail = useCallback((error: unknown, fallback: string) => {
        toast.error(error instanceof Error ? error.message : fallback);
    }, []);

    const refreshConversations = useCallback(async () => {
        try {
            setConversations(await api.listConversations());
        } catch (error) {
            fail(error, "Could not load conversations");
        } finally {
            setLoadingConversations(false);
        }
    }, [fail]);

    const refreshRequests = useCallback(async () => {
        try {
            setRequests(await api.listRequests());
        } catch {
            setRequests([]);
        }
    }, []);

    const reloadThread = useCallback(async (conversationId?: string) => {
        const target = conversationId ?? selectedIdRef.current;
        if (!target) return;

        try {
            const page = await api.listMessages(target);
            if (selectedIdRef.current !== target) return;
            setMessages(page.messages);
            setNextCursor(page.nextCursor);
        } catch {
            // the conversation may have become unavailable
        }
    }, []);

    useEffect(() => {
        void refreshConversations();
        void refreshRequests();
    }, [refreshConversations, refreshRequests]);

    useEffect(() => {
        if (!selectedId) {
            setMessages([]);
            setDetail(null);
            return;
        }

        let cancelled = false;
        setLoadingMessages(true);

        Promise.all([api.listMessages(selectedId), api.getConversation(selectedId)])
            .then(([page, conversationDetail]) => {
                if (cancelled) return;
                setMessages(page.messages);
                setNextCursor(page.nextCursor);
                setDetail(conversationDetail);
            })
            .catch((error) => !cancelled && fail(error, "Could not open the conversation"))
            .finally(() => !cancelled && setLoadingMessages(false));

        return () => {
            cancelled = true;
        };
    }, [selectedId, fail]);

    useRealtime({
        onConnectionChange: setConnected,
        onMessage: ({ conversationId }) => {
            void refreshConversations();
            if (conversationId === selectedIdRef.current) void reloadThread(conversationId);
        },
        onMessageUpdated: ({ conversationId }) => {
            if (conversationId === selectedIdRef.current) void reloadThread(conversationId);
        },
        onMessageDeleted: ({ conversationId }) => {
            void refreshConversations();
            if (conversationId === selectedIdRef.current) void reloadThread(conversationId);
        },
        onConversationUpdated: ({ conversationId }) => {
            void refreshConversations();
            void refreshRequests();
            setPeopleKey((key) => key + 1);
            if (conversationId && conversationId === selectedIdRef.current) {
                api.getConversation(conversationId).then(setDetail).catch(() => undefined);
                void reloadThread(conversationId);
            }
        },
        onConversationRemoved: ({ conversationId }) => {
            void refreshConversations();
            if (conversationId === selectedIdRef.current) {
                setSelectedId(null);
                toast.info("You were removed from that conversation");
            }
        },
        onRequest: () => {
            void refreshConversations();
            void refreshRequests();
        },
    });

    async function handleSend({ content, files }: { content: string; files: File[] }) {
        if (!selectedId) return;

        setSending(true);
        try {
            const attachments = await Promise.all(
                files.map(async (file) => ({
                    objectKey: await uploadFile("message", file),
                    mimeType: file.type || "application/octet-stream",
                    sizeBytes: file.size,
                    fileName: file.name,
                }))
            );

            const message = await api.sendMessage(selectedId, {
                content: content.trim() || undefined,
                type: files.length > 0 ? attachmentType(files) : "text",
                attachments: attachments.length > 0 ? attachments : undefined,
            });

            setMessages((existing) => [...existing, message]);
            void refreshConversations();
        } catch (error) {
            fail(error, "Could not send the message");
        } finally {
            setSending(false);
        }
    }

    async function loadMore() {
        if (!selectedId || !nextCursor) return;

        setLoadingMore(true);
        try {
            const page = await api.listMessages(selectedId, nextCursor);
            setMessages((existing) => [...page.messages, ...existing]);
            setNextCursor(page.nextCursor);
        } catch (error) {
            fail(error, "Could not load earlier messages");
        } finally {
            setLoadingMore(false);
        }
    }

    async function respondToRequest(conversationId: string, action: "accept" | "decline" | "reopen") {
        try {
            await api.respondToRequest(conversationId, action);
            toast.success(
                action === "accept"
                    ? "Request accepted"
                    : action === "reopen"
                      ? "You can send one more message"
                      : "Request declined"
            );
            await Promise.all([refreshConversations(), refreshRequests(), reloadThread(conversationId)]);
        } catch (error) {
            fail(error, "Could not update the request");
        }
    }

    async function startDirect(userId: string) {
        try {
            const { id } = await api.createDirect(userId);
            await refreshConversations();
            setPanel("chats");
            setSelectedId(id);
        } catch (error) {
            fail(error, "Could not open the conversation");
        }
    }

    async function toggleBlock() {
        if (!selected?.otherUserId) return;

        try {
            if (selected.blocked) {
                await api.unblockUser(selected.otherUserId);
                toast.success("User unblocked");
            } else {
                await api.blockUser(selected.otherUserId);
                toast.success("User blocked");
            }
            setPeopleKey((key) => key + 1);
            await refreshConversations();
        } catch (error) {
            fail(error, "Could not update the block");
        }
    }

    const pendingForMe = selected?.requestState === "pending" && selected.isRequestRecipient;
    const awaitingReply =
        selected?.requestState === "pending" && !selected.isRequestRecipient && (selected.lastMessageSeq ?? 0) > 0;
    const declinedByThem = selected?.requestState === "declined" && !selected.isRequestRecipient;
    const declinedByMe = selected?.requestState === "declined" && selected.isRequestRecipient;
    const isBlocked = Boolean(selected?.blocked);

    return (
        <div className="flex h-dvh items-stretch">
            <NavRail
                panel={panel}
                onPanelChange={setPanel}
                profile={profile}
                requestCount={requests.length}
                connected={connected}
                signingOut={signingOut}
                onOpenSettings={() => setSettingsOpen(true)}
                onSignOut={async () => {
                    setSigningOut(true);
                    await signOut();
                    router.replace("/login");
                    router.refresh();
                }}
            />

            {panel === "chats" && (
                <ChatsPanel
                    conversations={conversations}
                    selectedId={selectedId}
                    loading={loadingConversations}
                    requestCount={requests.length}
                    onSelect={setSelectedId}
                    onNewChat={() => setNewChatOpen(true)}
                    onNewGroup={() => setNewGroupOpen(true)}
                />
            )}

            {panel === "contacts" && (
                <ContactsPanel
                    reloadKey={peopleKey}
                    onMessage={startDirect}
                    onChanged={() => void refreshConversations()}
                    onError={(message) => toast.error(message)}
                    onSuccess={(message) => toast.success(message)}
                />
            )}

            {panel === "blocked" && (
                <BlockedPanel
                    reloadKey={peopleKey}
                    onChanged={() => void refreshConversations()}
                    onError={(message) => toast.error(message)}
                    onSuccess={(message) => toast.success(message)}
                />
            )}

            <aside className="flex min-h-0 flex-1 flex-col">
                {!selected ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                        <p className="text-lg font-medium">No conversation selected</p>
                        <p className="text-sm text-muted-foreground">
                            Pick a conversation, or start a new one to get going.
                        </p>
                        <Button onClick={() => setNewChatOpen(true)}>Start a conversation</Button>
                    </div>
                ) : (
                    <>
                        <ChatHeader
                            conversation={selected}
                            detail={detail}
                            onOpenInfo={() => setInfoOpen(true)}
                            onTogglePin={async () => {
                                try {
                                    await api.setPinned(selected.id, !selected.pinned);
                                    await refreshConversations();
                                } catch (error) {
                                    fail(error, "Could not update the pin");
                                }
                            }}
                        />

                        {pendingForMe && (
                            <div className="flex items-center gap-3 border-b bg-muted px-4 py-3">
                                <p className="flex-1 text-sm text-muted-foreground">
                                    {selected.name} is not in your contacts. You are only seeing their first message.
                                </p>
                                <Button size="sm" onClick={() => respondToRequest(selected.id, "accept")}>
                                    Accept
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => respondToRequest(selected.id, "decline")}>
                                    Decline
                                </Button>
                            </div>
                        )}

                        {declinedByMe && (
                            <div className="flex items-center gap-3 border-b bg-muted px-4 py-3">
                                <p className="flex-1 text-sm text-muted-foreground">
                                    You declined this message request. {selected.name} cannot message you unless you
                                    accept.
                                </p>
                                <Button size="sm" onClick={() => respondToRequest(selected.id, "accept")}>
                                    Accept anyway
                                </Button>
                            </div>
                        )}

                        <MessageThread
                            messages={messages}
                            members={detail?.members ?? []}
                            currentUserId={profile.id}
                            loading={loadingMessages}
                            hasMore={nextCursor !== null}
                            loadingMore={loadingMore}
                            onLoadMore={loadMore}
                            onReact={async (messageId, emoji) => {
                                try {
                                    await api.setReaction(messageId, emoji);
                                    await reloadThread();
                                } catch (error) {
                                    fail(error, "Could not react");
                                }
                            }}
                            onRemoveReaction={async (messageId) => {
                                try {
                                    await api.removeReaction(messageId);
                                    await reloadThread();
                                } catch (error) {
                                    fail(error, "Could not remove the reaction");
                                }
                            }}
                            onDelete={async (messageId) => {
                                try {
                                    await api.deleteMessage(messageId);
                                    await reloadThread();
                                    await refreshConversations();
                                } catch (error) {
                                    fail(error, "Could not delete the message");
                                }
                            }}
                        />

                        {declinedByThem ? (
                            <div className="flex items-center justify-between gap-3 border-t bg-muted px-4 py-4">
                                <p className="text-sm text-muted-foreground">
                                    {selected.name} declined your message request. They will not see anything else you
                                    send.
                                </p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => respondToRequest(selected.id, "reopen")}>
                                    Send another request
                                </Button>
                            </div>
                        ) : isBlocked ? (
                            <div className="flex items-center justify-between gap-3 border-t bg-muted px-4 py-4">
                                <p className="text-sm text-muted-foreground">
                                    You blocked {selected.name}. You cannot exchange messages until you unblock them.
                                </p>
                                <Button size="sm" variant="outline" onClick={toggleBlock}>
                                    Unblock
                                </Button>
                            </div>
                        ) : (
                            <>
                                {awaitingReply && (
                                    <p className="border-t bg-muted px-4 py-3 text-center text-sm text-muted-foreground">
                                        You can send one message until they reply to your request.
                                    </p>
                                )}
                                <Composer disabled={awaitingReply} sending={sending} onSend={handleSend} />
                            </>
                        )}
                    </>
                )}
            </aside>

            <NewChatDialog
                open={newChatOpen}
                onOpenChange={setNewChatOpen}
                onStarted={async (id) => {
                    await refreshConversations();
                    setPanel("chats");
                    setSelectedId(id);
                }}
                onError={(message) => toast.error(message)}
            />

            <NewGroupDialog
                open={newGroupOpen}
                onOpenChange={setNewGroupOpen}
                onCreated={async (id) => {
                    await refreshConversations();
                    setPanel("chats");
                    setSelectedId(id);
                    toast.success("Group created");
                }}
                onError={(message) => toast.error(message)}
            />

            <SettingsDialog
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
                profile={profile}
                onProfileChange={setProfile}
                onError={(message) => toast.error(message)}
                onSuccess={(message) => toast.success(message)}
            />

            <ConversationInfoSheet
                open={infoOpen}
                onOpenChange={setInfoOpen}
                detail={detail}
                currentUserId={profile.id}
                blocked={isBlocked}
                onChanged={async (updated) => {
                    setDetail(updated);
                    await Promise.all([refreshConversations(), reloadThread()]);
                }}
                onLeave={async () => {
                    if (!selected) return;
                    try {
                        await api.leaveConversation(selected.id);
                        toast.success("You left the group");
                        setInfoOpen(false);
                        setSelectedId(null);
                        await refreshConversations();
                    } catch (error) {
                        fail(error, "Could not leave the group");
                    }
                }}
                onToggleBlock={toggleBlock}
                onError={(message) => toast.error(message)}
                onSuccess={(message) => toast.success(message)}
            />
        </div>
    );
}
