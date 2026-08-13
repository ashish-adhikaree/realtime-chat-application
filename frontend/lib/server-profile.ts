import { cookies } from "next/headers";
import { API_URL } from "@/lib/config";
import type { Profile } from "@/lib/types";

export async function getServerProfile(): Promise<Profile | null> {
    const cookieStore = await cookies();

    const cookieHeader = cookieStore
        .getAll()
        .map(({ name, value }) => `${name}=${value}`)
        .join("; ");

    if (!cookieHeader) return null;

    try {
        const response = await fetch(`${API_URL}/api/v1/users/me`, {
            headers: { cookie: cookieHeader },
            cache: "no-store",
        });

        if (!response.ok) return null;

        return (await response.json()) as Profile;
    } catch {
        return null;
    }
}
