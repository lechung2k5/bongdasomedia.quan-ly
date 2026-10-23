import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BÓNG ĐÁ SỐ MEDIA ERP | Hệ thống Điều phối Vận hành',
  description: 'Hệ thống quản lý lịch trình, thiết bị, định vị GPS nhân sự và thu chi truyền thông thể thao.',
  icons: {
    icon: [
      { url: '/logo/logo_rutgon.jpg', type: 'image/jpeg' },
      { url: '/logo/logo_rutgon.jpg', sizes: '192x192', type: 'image/jpeg' },
    ],
    shortcut: '/logo/logo_rutgon.jpg',
    apple: '/logo/logo_rutgon.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full antialiased">
      <head>
        <link rel="icon" href="/logo/logo_rutgon.jpg" type="image/jpeg" />
        <link rel="shortcut icon" href="/logo/logo_rutgon.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/logo/logo_rutgon.jpg" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js" async></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#f4f6fa] text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
