import { ImageResponse } from "next/og";

// iPhone home-screen icon (iOS doesn't use SVG icons).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e4572e",
          color: "#fffdf9",
          fontSize: 112,
          fontWeight: 700,
        }}
      >
        A
      </div>
    ),
    size,
  );
}
