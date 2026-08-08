"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirectTo") ?? "/";

    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [googlePending, setGooglePending] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setPending(true);

        const formData = new FormData(event.currentTarget);

        const { error: signInError } = await signIn.email({
            email: String(formData.get("email")),
            password: String(formData.get("password")),
        });

        if (signInError) {
            setError(signInError.message ?? "Unable to sign in.");
            setPending(false);
            return;
        }

        router.replace(redirectTo);
        router.refresh();
    }

    async function handleGoogle() {
        setError(null);
        setGooglePending(true);

        const { error: socialError } = await signIn.social({
            provider: "google",
            callbackURL: new URL(redirectTo, window.location.origin).toString(),
        });

        if (socialError) {
            setError(socialError.message ?? "Unable to sign in with Google.");
            setGooglePending(false);
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader>
                    <CardTitle>Login to your account</CardTitle>
                    <CardDescription>Enter your email below to login to your account</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input id="email" name="email" type="email" placeholder="m@example.com" required />
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">Password</FieldLabel>
                                    <Link
                                        href="/forgot-password"
                                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                                        Forgot your password?
                                    </Link>
                                </div>
                                <Input id="password" name="password" type="password" required />
                            </Field>
                            {error && <FieldError>{error}</FieldError>}
                            <Field>
                                <Button type="submit" disabled={pending || googlePending}>
                                    {pending ? "Logging in..." : "Login"}
                                </Button>
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={handleGoogle}
                                    disabled={pending || googlePending}>
                                    {googlePending ? "Redirecting..." : "Login with Google"}
                                </Button>
                                <FieldDescription className="text-center">
                                    Don&apos;t have an account? <Link href="/register">Sign up</Link>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
