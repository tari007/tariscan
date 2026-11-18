import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TariScan POS",
    short_name: "TariScan",
    description: "Offline-first retail point of sale and inventory management.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f5f7fb",
    theme_color: "#111a2e",
    categories: ["business", "productivity", "finance"],
    icons: [
      { src: "/icons/tariscan-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/tariscan-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
