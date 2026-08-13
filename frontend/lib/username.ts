import { authClient } from "@/lib/auth-client";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export function slugifyUsername(name: string) {
    const base = name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 24);

    return base.length >= 3 ? base : `${base}_user`.slice(0, 24);
}

async function isAvailable(username: string) {
    try {
        const { data } = await authClient.isUsernameAvailable({ username });
        return data?.available ?? false;
    } catch {
        return false;
    }
}

export async function suggestUsername(name: string) {
    const base = slugifyUsername(name);

    if (await isAvailable(base)) return base;

    for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = `${base}${Math.floor(Math.random() * 10_000)}`.slice(0, 30);
        if (await isAvailable(candidate)) return candidate;
    }

    return `${base}${Date.now().toString().slice(-6)}`.slice(0, 30);
}
