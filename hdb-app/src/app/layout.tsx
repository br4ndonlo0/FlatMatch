import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-lato",
});

export const metadata: Metadata = {
  title: "Resale HDB Finder",
  description: "Find your dream resale HDB flat.", // Removed duplicate
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lato.variable} font-sans antialiased min-h-screen bg-blue-100`}
        style={{ fontFamily: 'Lato, sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}