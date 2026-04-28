import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Topbar } from "@/components/layout/topbar";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { ScrollToTop } from "@/components/ui/ScrollToTop";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "APEX ROBOT ID QR",
  description: "MiniSumo Robot Dashboard and Organizer Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen font-sans antialiased text-brand-text`}>
        <div className="max-w-[1200px] mx-auto px-4 py-4 w-full h-full flex flex-col">
          <Providers>
            <Topbar />
            <main className="flex-1 w-full h-full">
              {children}
            </main>
            <ScrollToTop />
          </Providers>
        </div>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
