import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GoalPilot",
  description: "A focused daily planner powered by Supabase and server-side OpenRouter planning."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

