import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "あげた | Ageta",
  description: "筋トレの「上げた」を記録して祝おう",
  applicationName: "Ageta",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "あげた | Ageta",
  },
  openGraph: {
    title: "あげた | Ageta",
    siteName: "Ageta",
    description: "筋トレの「上げた」を記録して祝おう",
  },
};

export const viewport: Viewport = {
  themeColor: "#FAFAF8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <div className="mx-auto min-h-screen max-w-md bg-ivory">
          <main className="pb-24">{children}</main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
