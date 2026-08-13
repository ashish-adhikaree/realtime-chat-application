export type ConversationType = "direct" | "group";

export type MemberRole = "admin" | "member";

export type MessageType = "text" | "image" | "video" | "audio" | "file" | "system";

export type RequestState = "pending" | "accepted" | "declined";

export type NonContactPolicy = "everyone" | "request" | "nobody";

export type SystemEvent =
    | "group_created"
    | "member_added"
    | "member_removed"
    | "member_left"
    | "role_changed"
    | "group_renamed"
    | "group_image_changed";

export type Profile = {
    id: string;
    name: string;
    email: string;
    username: string | null;
    displayUsername: string | null;
    image: string | null;
    hasCustomAvatar: boolean;
    settings: {
        nonContactPolicy: NonContactPolicy;
        allowGroupInvitesFromNonContacts: boolean;
    };
};

export type PublicUser = {
    id: string;
    name: string;
    username: string | null;
    displayUsername?: string | null;
    image: string | null;
    isContact?: boolean;
};

export type Contact = PublicUser & {
    realName: string;
    alias: string | null;
    favorite: boolean;
};

export type Conversation = {
    id: string;
    type: ConversationType;
    name: string;
    image: string | null;
    role: MemberRole;
    pinned: boolean;
    muted: boolean;
    lastMessage: string | null;
    lastMessageAt: string | null;
    lastMessageSeq: number | null;
    otherUserId: string | null;
    memberCount: number;
    memberAvatars: string[];
    requestState: RequestState | null;
    isRequestRecipient: boolean;
    favorite: boolean;
    blocked: boolean;
};

export type ConversationMember = {
    id: string;
    name: string;
    username: string | null;
    image: string | null;
    role: MemberRole;
    joinedAt: string;
    active: boolean;
    favorite: boolean;
    isContact: boolean;
};

export type ConversationDetail = {
    id: string;
    type: ConversationType;
    name: string;
    description: string | null;
    image: string | null;
    onlyAdminsCanEditInfo: boolean;
    onlyAdminsCanAddMembers: boolean;
    createdBy: string | null;
    members: ConversationMember[];
    otherUserId: string | null;
};

export type Attachment = {
    id: string;
    url: string | null;
    thumbnailUrl: string | null;
    mimeType: string;
    sizeBytes: number;
    fileName: string | null;
    width: number | null;
    height: number | null;
    durationMs: number | null;
};

export type Reaction = {
    emoji: string;
    count: number;
    users: string[];
    reactedByMe: boolean;
};

export type MessageMetadata = {
    targetUserIds?: string[];
    previousName?: string;
    newName?: string;
    previousRole?: MemberRole;
    newRole?: MemberRole;
    mentionedUserIds?: string[];
};

export type Message = {
    id: string;
    conversationId: string;
    seq: number;
    senderId: string | null;
    senderName: string | null;
    senderImage: string | null;
    type: MessageType;
    content: string | null;
    systemEvent: SystemEvent | null;
    metadata: MessageMetadata | null;
    replyToId: string | null;
    editedAt: string | null;
    deletedAt: string | null;
    createdAt: string;
    attachments: Attachment[];
    reactions: Reaction[];
};

export type MessagePage = {
    messages: Message[];
    nextCursor: number | null;
};

export type MessageRequest = {
    conversationId: string;
    createdAt: string;
    from: PublicUser;
    preview: string | null;
};
