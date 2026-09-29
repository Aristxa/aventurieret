import { ImageResponse } from "next/og";

// Link preview image for the home page (WhatsApp, iMessage, social posts).
export const alt = "Aventurieret: your whole trip, planned like a local";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "linear-gradient(135deg, #f6f1e9 0%, #fbe4da 100%)",
          color: "#1d1b18",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
          Aventurieret<span style={{ color: "#e4572e" }}>.</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40, fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>
          <span>Your whole trip,</span>
          <span style={{ color: "#e4572e" }}>planned like a local.</span>
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 32, color: "#6f675c" }}>
          Hidden gems · day-by-day plans · TikTok spots on your map
        </div>
      </div>
    ),
    size,
  );
}
