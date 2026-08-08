"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { requestPasswordReset } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm({ className, ...props }: React.ComponentProps<"div">) {
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const [pending, setPending] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setPending(true);

        const formData = new FormData(event.currentTarget);

        const { error: resetError } = await requestPasswordReset({
            email: String(formData.get("email")),
            redirectTo: `${window.location.origin}/reset-password`,
        });

        setPending(false);

        if (resetError) {
            setError(resetError.message ?? "Unable to send the reset link.");
            return;
        }

        setSent(true);
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Forgot your password?</CardTitle>
                    <CardDescription>
                        Enter your email below and we&apos;ll send you a link to reset your password
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {sent ? (
                        <FieldGroup>
                            <FieldDescription>
                                If an account exists for that email, a reset link is on its way.
                            </FieldDescription>
                            <FieldDescription className="text-center">
                                <Link href="/login">Back to login</Link>
                            </FieldDescription>
                        </FieldGroup>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="email">Email</FieldLabel>
                                    <Input id="email" name="email" type="email" placeholder="m@example.com" required />
                                </Field>
                                {error && <FieldError>{error}</FieldError>}
                                <Field>
                                    <Button type="submit" disabled={pending}>
                                        {pending ? "Sending..." : "Send reset link"}
                                    </Button>
                                    <FieldDescription className="text-center">
                                        Remember your password? <Link href="/login">Login</Link>
                                    </FieldDescription>
                                </Field>
                            </FieldGroup>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
