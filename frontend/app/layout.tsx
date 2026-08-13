import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "PingMe",
    description: "A real-time chat application built with Next.js, React, and WebSockets.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={cn(
                "h-full dark",
                "antialiased",
                geistSans.variable,
                geistMono.variable,
                "font-sans",
                spaceGrotesk.variable,
            )}>
            <body className="min-h-full flex flex-col">
                {children}
                <Toaster />
            </body>
        </html>
    );
}
