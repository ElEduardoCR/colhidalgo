import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Sidebar } from "@/components/Sidebar";
import { LoadingGate } from "@/components/LoadingGate";

export const metadata: Metadata = {
  title: "Junta Rural de Agua Potable - Col. Hidalgo",
  description:
    "Sistema de morosidad y convenios de pago de la Junta Rural de Agua Potable de Col. Hidalgo.",
};

export const viewport: Viewport = {
  themeColor: "#0e2b4e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-pizarra-bg font-sans text-marino-800">
        <StoreProvider>
          <div className="flex min-h-screen flex-col md:flex-row">
            <Sidebar />
            <main className="w-full min-w-0 flex-1 px-4 py-7 sm:px-6 md:px-8 md:py-10 lg:px-12">
              <div className="mx-auto w-full max-w-6xl">
                <LoadingGate>{children}</LoadingGate>
              </div>
            </main>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
