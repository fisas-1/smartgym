import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "gym.",
  description: "Track your training",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca">
      <body className={`${inter.className} antialiased bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]`}>
        <Providers>
          {children}
          <Navigation />
        </Providers>
      </body>
    </html>
  );
}