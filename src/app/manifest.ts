import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/base-path";

// Replaces public/manifest.json so start_url/scope/icons honour BASE_PATH.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "mytree - 함께 쓰는 공유 캘린더",
    short_name: "mytree",
    description: "가족, 연인, 친구와 일정을 공유하고 소통하는 TimeTree 클론 캘린더",
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#10B981",
    icons: [
      {
        src: `${BASE_PATH}/icons/icon.svg`,
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
