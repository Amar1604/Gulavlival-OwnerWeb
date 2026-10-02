import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gulavlival Grand — Staff, Manager & Owner Portal",
  description: "Private restaurant operations portal for counter orders, kitchen dispatch, menu availability, and store management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-neutral-950 text-neutral-100 dark">
      <body className={`${inter.className} min-h-full flex flex-col bg-neutral-950 antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
