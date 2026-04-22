import type { Metadata } from "next";
import { AppSwitcher } from "@/components/app-switcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "إنجازاتي | معارضنا",
  description: "مضيف واحد لتجربتي إنجازاتي ومعارضنا داخل مدرسة البلد الأمين"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html dir="rtl" lang="ar">
      <body>
        <AppSwitcher />
        {children}
      </body>
    </html>
  );
}
