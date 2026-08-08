"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
    const router = useRouter();

    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [googlePending, setGooglePending] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        const formData = new FormData(event.currentTarget);
        const password = String(formData.get("password"));
        const confirmPassword = String(formData.get("confirm-password"));

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setPending(true);

        const { error: signUpError } = await signUp.email({
            name: String(formData.get("name")),
            email: String(formData.get("email")),
            password,
        });

        if (signUpError) {
            setError(signUpError.message ?? "Unable to create your account.");
            setPending(false);
            return;
        }

        router.replace("/");
        router.refresh();
    }

    async function handleGoogle() {
        setError(null);
        setGooglePending(true);

        const { error: socialError } = await signIn.social({
            provider: "google",
            callbackURL: window.location.origin,
        });

        if (socialError) {
            setError(socialError.message ?? "Unable to sign up with Google.");
            setGooglePending(false);
        }
    }

    return (
        <Card {...props}>
            <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>Enter your information below to create your account</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit}>
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="name">Full Name</FieldLabel>
                            <Input id="name" name="name" type="text" placeholder="John Doe" required />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="email">Email</FieldLabel>
                            <Input id="email" name="email" type="email" placeholder="m@example.com" required />
                            <FieldDescription>
                                We&apos;ll use this to contact you. We will not share your email with anyone else.
                            </FieldDescription>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="password">Password</FieldLabel>
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
                            <FieldDescription>Please confirm your password.</FieldDescription>
                        </Field>
                        {error && <FieldError>{error}</FieldError>}
                        <FieldGroup>
                            <Field>
                                <Button type="submit" disabled={pending || googlePending}>
                                    {pending ? "Creating account..." : "Create Account"}
                                </Button>
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={handleGoogle}
                                    disabled={pending || googlePending}>
                                    {googlePending ? "Redirecting..." : "Sign up with Google"}
                                </Button>
                                <FieldDescription className="px-6 text-center">
                                    Already have an account? <Link href="/login">Sign in</Link>
                                </FieldDescription>
                            </Field>
                        </FieldGroup>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    );
}
