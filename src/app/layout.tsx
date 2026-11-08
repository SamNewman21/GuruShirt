import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GuruShirt Studio — 2D & 3D Garment Design Engine",
  description:
    "Next-generation 2D & 3D apparel customization studio inspired by CLO 3D, Browzwear, Printful, and Kittl.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
