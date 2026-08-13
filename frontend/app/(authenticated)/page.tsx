import { redirect } from "next/navigation";
import { ChatView } from "@/components/chat/chat-view";
import { getServerSession } from "@/lib/session";
import { getServerProfile } from "@/lib/server-profile";

export default async function Home() {
    const session = await getServerSession();

    if (!session) {
        redirect("/login");
    }

    const profile = await getServerProfile();

    if (!profile) {
        redirect("/login");
    }

    return <ChatView profile={profile} />;
}
