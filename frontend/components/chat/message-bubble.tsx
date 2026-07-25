import { HugeiconsIcon } from "@hugeicons/react";
import { Tick01Icon, TickDouble01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Message } from "@/lib/types";

function renderContent(message: Message) {
    const needle = message.mention ?? message.link?.label;
    if (!needle || !message.content.includes(needle)) {
        return message.content;
    }

    const [before, after] = message.content.split(needle);
    const highlighted = message.mention ? (
        <span className="font-medium text-primary">{needle}</span>
    ) : (
        <a
            href={message.link!.url}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
        >
            {needle}
        </a>
    );

    return (
        <>
            {before}
            {highlighted}
            {after}
        </>
    );
}

export function MessageBubble({
    message,
    showSender,
}: {
    message: Message;
    showSender: boolean;
}) {
    return (
        <div className={cn("flex items-end gap-2", message.isOwn && "justify-end")}>
            {!message.isOwn && (
                <Avatar size="sm" className={cn(!showSender && "invisible")}>
                    <AvatarImage src={message.senderAvatar} />
                    <AvatarFallback>{message.senderName.slice(0, 2)}</AvatarFallback>
                </Avatar>
            )}
            <div className="flex max-w-[70%] flex-col gap-1">
                {showSender && !message.isOwn && (
                    <span className="px-1 text-xs font-medium text-muted-foreground">
                        {message.senderName}
                    </span>
                )}
                <div
                    className={cn(
                        "rounded-2xl px-3 py-2 text-sm",
                        message.isOwn
                            ? "rounded-tr-md bg-primary text-primary-foreground"
                            : "rounded-tl-md bg-card text-card-foreground ring-1 ring-foreground/10"
                    )}
                >
                    {renderContent(message)}
                </div>
                <div
                    className={cn(
                        "flex items-center gap-1 px-1 text-xs text-muted-foreground",
                        message.isOwn && "justify-end"
                    )}
                >
                    <span>{message.timestamp}</span>
                    {message.isOwn && message.status && (
                        <HugeiconsIcon
                            icon={message.status === "sent" ? Tick01Icon : TickDouble01Icon}
                            className={cn("size-3.5", message.status === "read" && "text-primary")}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
