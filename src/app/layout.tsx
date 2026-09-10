import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { LocalDateCookie } from "@/components/local-date-cookie";
import { getSession } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Steady — self-help tracking tool",
  description:
    "Track daily through quarterly goals and roll financial categories into one period target.",
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background font-sans">
        <LocalDateCookie />
        <AppHeader name={session?.user.name} email={session?.user.email} />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
