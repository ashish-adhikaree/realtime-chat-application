"use client";

import { useState } from "react";
import { Mic01Icon, PlusSignIcon, SentIcon, SmileIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { AccountMenu } from "@/components/chat/account-menu";
import { ChatHeader } from "@/components/chat/chat-header";
import { ConversationList } from "@/components/chat/conversation-list";
import { MessageThread } from "@/components/chat/message-thread";
import { mockConversations, mockMessagesByConversation } from "@/lib/mock";
import type { User } from "@/lib/auth-client";

export function ChatView({ user }: { user: User }) {
    const [selectedId, setSelectedId] = useState(mockConversations[0].id);
    const selectedConversation = mockConversations.find((c) => c.id === selectedId) ?? mockConversations[0];
    const messages = mockMessagesByConversation[selectedId] ?? [];
    const [messageInput, setMessageInput] = useState("");

    return (
        <div className="flex h-dvh items-stretch">
            <aside className="flex min-h-0 w-[380px] flex-col border-r bg-card p-4">
                <AccountMenu user={user} />
                <ConversationList conversations={mockConversations} selectedId={selectedId} onSelect={setSelectedId} />
            </aside>
            <aside className="flex min-h-0 flex-1 flex-col">
                <ChatHeader conversation={selectedConversation} />
                <MessageThread messages={messages} />
                <div className="p-3">
                    <InputGroup>
                        <InputGroupAddon className="gap-0">
                            <InputGroupButton size="icon-sm" variant="ghost">
                                <HugeiconsIcon icon={PlusSignIcon} />
                            </InputGroupButton>
                            <InputGroupButton size="icon-sm" variant="ghost">
                                <HugeiconsIcon icon={SmileIcon} />
                            </InputGroupButton>
                        </InputGroupAddon>
                        <InputGroupTextarea
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.currentTarget.value)}
                            className="min-h-8 py-1"
                            placeholder="Type a message"
                        />
                        <InputGroupAddon align="inline-end">
                            {messageInput.length > 0 ? (
                                <InputGroupButton size="icon-sm" variant="default">
                                    <HugeiconsIcon icon={SentIcon} />
                                </InputGroupButton>
                            ) : (
                                <InputGroupButton size="icon-sm" variant="ghost">
                                    <HugeiconsIcon icon={Mic01Icon} />
                                </InputGroupButton>
                            )}
                        </InputGroupAddon>
                    </InputGroup>
                </div>
            </aside>
        </div>
    );
}
