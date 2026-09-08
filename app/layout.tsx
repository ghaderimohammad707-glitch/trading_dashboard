import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { FontSizeProvider } from "@/lib/fontSize";
import { Toaster } from "@/components/ui/sonner";
import "../src/index.css";

export const metadata: Metadata = {
  title: "Iran Stock Analyzer",
  description: "Professional Iranian Stock Market Analyzer with Fundamental Analysis Engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          disableTransitionOnChange
        >
          <FontSizeProvider>
            {children}
            <Toaster />
          </FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
