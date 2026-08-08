import { cookies } from "next/headers";
import { API_URL } from "@/lib/config";
import type { Session, User } from "@/lib/auth-client";

export type SessionResponse = {
    session: Session;
    user: User;
};

export async function getServerSession(): Promise<SessionResponse | null> {
    const cookieStore = await cookies();

    const cookieHeader = cookieStore
        .getAll()
        .map(({ name, value }) => `${name}=${value}`)
        .join("; ");

    if (!cookieHeader) return null;

    try {
        const response = await fetch(`${API_URL}/api/auth/get-session`, {
            headers: { cookie: cookieHeader },
            cache: "no-store",
        });

        if (!response.ok) return null;

        const data = await response.text();
        if (!data) return null;

        return JSON.parse(data) as SessionResponse;
    } catch {
        return null;
    }
}
