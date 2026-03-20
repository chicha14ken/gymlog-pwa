import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: {
    default: 'Ageta — あげた',
    template: '%s | Ageta',
  },
  description: 'PRが更新されたとき、アプリが最初に気づく。ジムログPWA。',
  applicationName: 'Ageta',
  keywords: ['ジム', 'トレーニング', '筋トレ', 'ログ', 'PR', 'ワークアウト'],
  authors: [{ name: 'Yatta Moment' }],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32' },
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192' }],
    shortcut: '/favicon.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'Ageta — あげた',
    description: 'PRが更新されたとき、アプリが最初に気づく。',
    url: 'https://ageta-pwa.vercel.app',
    siteName: 'Ageta',
    images: [{ url: 'https://ageta-pwa.vercel.app/ogp.png', width: 1200, height: 630, alt: 'Ageta — ジムログPWA' }],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ageta — あげた',
    description: 'PRが更新されたとき、アプリが最初に気づく。',
    images: ['https://ageta-pwa.vercel.app/ogp.png'],
    site: '@ageta_app',
  },
};

export const viewport: Viewport = {
  themeColor: '#111318',
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
