import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JRAS Hidalgo - Morosidad y convenios",
    short_name: "JRAS Hidalgo",
    description:
      "Sistema de morosidad y convenios de pago de la Junta Rural de Agua Potable de Col. Hidalgo.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0e2b4e",
    theme_color: "#0e2b4e",
    lang: "es-MX",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icono-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
