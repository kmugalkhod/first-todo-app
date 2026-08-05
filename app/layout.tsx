import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// Taskspace display face (DESIGN.md typography). Set as --font-heading.
const archivoDisplay = localFont({
  src: "../public/archivo-display.ttf",
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Taskspace",
  description: "A focused workspace for your tasks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivoDisplay.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
