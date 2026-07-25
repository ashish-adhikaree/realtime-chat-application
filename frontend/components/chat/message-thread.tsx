import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "@/components/chat/message-bubble";
import type { Message } from "@/lib/types";

export function MessageThread({ messages }: { messages: Message[] }) {
    return (
        <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-center py-1">
                    <span className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground ring-1 ring-foreground/10">
                        Today
                    </span>
                </div>
                {messages.map((message, index) => {
                    const previous = messages[index - 1];
                    const showSender = !previous || previous.senderId !== message.senderId;
                    return (
                        <MessageBubble key={message.id} message={message} showSender={showSender} />
                    );
                })}
            </div>
        </ScrollArea>
    );
}
