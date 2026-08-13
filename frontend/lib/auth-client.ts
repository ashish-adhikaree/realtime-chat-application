import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { API_URL } from "@/lib/config";

export const authClient = createAuthClient({
    baseURL: API_URL,
    plugins: [usernameClient()],
});

export const { signIn, signUp, signOut, useSession, requestPasswordReset, resetPassword, getSession } = authClient;

export type Session = typeof authClient.$Infer.Session.session;
export type User = typeof authClient.$Infer.Session.user;
