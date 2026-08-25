import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Sidebar } from "@/components/Sidebar";
import { LoadingGate } from "@/components/LoadingGate";

export const metadata: Metadata = {
  title: "Junta Rural de Agua Potable - Col. Hidalgo",
  description:
    "Sistema de morosidad y convenios de pago de la Junta Rural de Agua Potable de Col. Hidalgo.",
  applicationName: "JRAS Hidalgo",
  // Instalada en la pantalla de inicio del iPad: nombre corto bajo el icono y
  // barra de estado integrada con el azul marino de la cabecera.
  appleWebApp: {
    capable: true,
    title: "JRAS Hidalgo",
    statusBarStyle: "black-translucent",
  },
  // Next 16 solo emite el nombre estandarizado 'mobile-web-app-capable'. iOS
  // anterior a 16.4 unicamente entiende el de Apple, y sin el la app se abre
  // dentro de Safari en vez de a pantalla completa.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#0e2b4e",
  // Necesario para que env(safe-area-inset-*) deje de valer 0 en iOS.
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
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
          <div className="flex min-h-screen flex-col lg:flex-row">
            <Sidebar />
            <main className="safe-x w-full min-w-0 flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-10 xl:px-12">
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
