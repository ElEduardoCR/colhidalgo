import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Junta Rural de Agua y Saneamiento",
  description:
    "Sistema de morosidad y convenios de pago para la Junta Rural de Agua y Saneamiento.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans">
        <StoreProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 px-6 py-8 md:px-10 md:py-10 max-w-6xl mx-auto w-full">
              {children}
            </main>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
