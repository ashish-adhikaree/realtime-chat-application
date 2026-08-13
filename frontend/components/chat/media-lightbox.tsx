"use client";

import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon, Download01Icon } from "@hugeicons/core-free-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatMessageTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type MediaItem = {
    id: string;
    url: string | null;
    downloadUrl: string | null;
    mimeType: string;
    fileName: string | null;
    senderName: string | null;
    createdAt: string;
};

export function MediaLightbox({
    items,
    openId,
    onOpenChange,
}: {
    items: MediaItem[];
    openId: string | null;
    onOpenChange: (id: string | null) => void;
}) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (!openId) return;
        const next = items.findIndex((item) => item.id === openId);
        if (next >= 0) setIndex(next);
    }, [openId, items]);

    const close = useCallback(() => onOpenChange(null), [onOpenChange]);

    const step = useCallback(
        (delta: number) => {
            setIndex((current) => {
                if (items.length === 0) return current;
                return (current + delta + items.length) % items.length;
            });
        },
        [items.length]
    );

    useEffect(() => {
        if (!openId) return;

        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") close();
            if (event.key === "ArrowRight") step(1);
            if (event.key === "ArrowLeft") step(-1);
        }

        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [openId, close, step]);

    if (!openId || items.length === 0) return null;

    const active = items[index];
    if (!active) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Media viewer"
            className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm"
            onClick={close}>
            <header
                className="flex items-center gap-3 border-b px-4 py-3"
                onClick={(event) => event.stopPropagation()}>
                <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{active.senderName ?? "Unknown"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                        {formatMessageTime(active.createdAt)}
                        {items.length > 1 && ` · ${index + 1} of ${items.length}`}
                    </p>
                </div>

                {(active.downloadUrl ?? active.url) && (
                    <a
                        href={active.downloadUrl ?? active.url ?? undefined}
                        download={active.fileName ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Download"
                        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}>
                        <HugeiconsIcon icon={Download01Icon} />
                    </a>
                )}

                <Button size="icon-sm" variant="ghost" aria-label="Close viewer" onClick={close}>
                    <HugeiconsIcon icon={Cancel01Icon} />
                </Button>
            </header>

            <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
                {items.length > 1 && (
                    <Button
                        size="icon"
                        variant="secondary"
                        aria-label="Previous"
                        className="absolute left-4 z-10 rounded-full"
                        onClick={(event) => {
                            event.stopPropagation();
                            step(-1);
                        }}>
                        <HugeiconsIcon icon={ArrowLeft01Icon} />
                    </Button>
                )}

                <div className="flex max-h-full max-w-5xl items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    {active.url && active.mimeType.startsWith("video/") ? (
                        <video src={active.url} controls autoPlay className="max-h-[75vh] max-w-full rounded-lg" />
                    ) : active.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={active.url}
                            alt={active.fileName ?? "Attachment"}
                            className="max-h-[75vh] max-w-full rounded-lg object-contain"
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">This attachment is unavailable</p>
                    )}
                </div>

                {items.length > 1 && (
                    <Button
                        size="icon"
                        variant="secondary"
                        aria-label="Next"
                        className="absolute right-4 z-10 rounded-full"
                        onClick={(event) => {
                            event.stopPropagation();
                            step(1);
                        }}>
                        <HugeiconsIcon icon={ArrowRight01Icon} />
                    </Button>
                )}
            </div>

            {items.length > 1 && (
                <footer
                    className="flex items-center justify-center gap-2 overflow-x-auto border-t px-4 py-3"
                    onClick={(event) => event.stopPropagation()}>
                    {items.map((item, itemIndex) => (
                        <button
                            key={item.id}
                            type="button"
                            aria-label={`View item ${itemIndex + 1}`}
                            onClick={() => setIndex(itemIndex)}
                            className={cn(
                                "size-14 shrink-0 overflow-hidden rounded-md ring-1 transition-opacity",
                                itemIndex === index ? "ring-2 ring-primary" : "opacity-60 ring-foreground/10"
                            )}>
                            {item.url && !item.mimeType.startsWith("video/") ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.url} alt="" className="size-full object-cover" />
                            ) : (
                                <span className="flex size-full items-center justify-center bg-muted text-xs">
                                    {item.mimeType.startsWith("video/") ? "Video" : "File"}
                                </span>
                            )}
                        </button>
                    ))}
                </footer>
            )}
        </div>
    );
}
