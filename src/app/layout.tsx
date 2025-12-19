import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ระบบแบบฟอร์มครอบครัวสุขภาพดี | รพ.สต.มะตูม",
  description: "ระบบบันทึกและจัดการข้อมูลสุขภาพประชาชน รพ.สต.มะตูม ตำบลมะตูม",
  manifest: "/manifest.json",
  themeColor: "#0d9488",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
