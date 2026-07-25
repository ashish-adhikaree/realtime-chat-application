export type MessageStatus = "sent" | "delivered" | "read";

export type Conversation = {
    id: string;
    name: string;
    avatar?: string;
    isGroup: boolean;
    memberAvatars?: string[];
    lastMessage: string;
    lastMessageTime: string;
    lastMessageIsOwn: boolean;
    lastMessageStatus?: MessageStatus;
    unreadCount: number;
    pinned: boolean;
    online: boolean;
    typing: boolean;
};

export type Message = {
    id: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    timestamp: string;
    isOwn: boolean;
    status?: MessageStatus;
    mention?: string;
    link?: { label: string; url: string };
};
