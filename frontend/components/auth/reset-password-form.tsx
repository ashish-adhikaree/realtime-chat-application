"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { resetPassword } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({ className, ...props }: React.ComponentProps<"div">) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const linkError = searchParams.get("error");

    const [error, setError] = useState<string | null>(
        linkError ? "This reset link is invalid or has expired." : null
    );
    const [pending, setPending] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        if (!token) {
            setError("This reset link is invalid or has expired.");
            return;
        }

        const formData = new FormData(event.currentTarget);
        const password = String(formData.get("password"));

        if (password !== String(formData.get("confirm-password"))) {
            setError("Passwords do not match.");
            return;
        }

        setPending(true);

        const { error: resetError } = await resetPassword({ newPassword: password, token });

        if (resetError) {
            setError(resetError.message ?? "Unable to reset your password.");
            setPending(false);
            return;
        }

        router.replace("/login");
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Choose a new password</CardTitle>
                    <CardDescription>Enter a new password for your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="password">New Password</FieldLabel>
                                <Input id="password" name="password" type="password" minLength={8} required />
                                <FieldDescription>Must be at least 8 characters long.</FieldDescription>
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                                <Input
                                    id="confirm-password"
                                    name="confirm-password"
                                    type="password"
                                    minLength={8}
                                    required
                                />
                            </Field>
                            {error && <FieldError>{error}</FieldError>}
                            <Field>
                                <Button type="submit" disabled={pending || !token}>
                                    {pending ? "Saving..." : "Reset password"}
                                </Button>
                                <FieldDescription className="text-center">
                                    Remember your password? <Link href="/login">Login</Link>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
