"use client";

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, PlusSignIcon, SentIcon } from "@hugeicons/core-free-icons";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Composer({
    disabled,
    sending,
    onSend,
}: {
    disabled?: boolean;
    sending: boolean;
    onSend: (input: { content: string; files: File[] }) => Promise<void>;
}) {
    const [value, setValue] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const canSend = !sending && !disabled && (value.trim().length > 0 || files.length > 0);

    async function submit() {
        if (!canSend) return;

        const content = value;
        const attached = files;

        setValue("");
        setFiles([]);

        await onSend({ content, files: attached });
    }

    return (
        <div className="flex flex-col gap-2 p-3">
            {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {files.map((file, index) => (
                        <div
                            key={`${file.name}-${index}`}
                            className="flex items-center gap-2 rounded-lg bg-card px-2 py-1 text-sm ring-1 ring-foreground/10">
                            <span className="max-w-40 truncate">{file.name}</span>
                            <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                            <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>
                                <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <InputGroup>
                <InputGroupAddon className="gap-0">
                    <InputGroupButton
                        size="icon-sm"
                        variant="ghost"
                        disabled={disabled}
                        onClick={() => fileInputRef.current?.click()}>
                        <HugeiconsIcon icon={PlusSignIcon} />
                    </InputGroupButton>
                </InputGroupAddon>

                <InputGroupTextarea
                    value={value}
                    disabled={disabled}
                    onChange={(event) => setValue(event.currentTarget.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void submit();
                        }
                    }}
                    className="min-h-8 py-1"
                    placeholder={disabled ? "You can't send messages here" : "Type a message"}
                />

                <InputGroupAddon align="inline-end">
                    <InputGroupButton
                        size="icon-sm"
                        variant={canSend ? "default" : "ghost"}
                        disabled={!canSend}
                        onClick={() => void submit()}>
                        <HugeiconsIcon icon={SentIcon} className={cn(sending && "animate-pulse")} />
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>

            <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={(event) => {
                    setFiles((current) => [...current, ...Array.from(event.currentTarget.files ?? [])].slice(0, 10));
                    event.currentTarget.value = "";
                }}
            />
        </div>
    );
}
