import { ImageResponse } from "next/og";

export const alt = "Alloqo - Intelligent Investment";
export const size = { width: 800, height: 800 };
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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a2348 0%, #3a4fd1 55%, #5b3fd6 100%)",
        }}
      >
        <svg width="160" height="160" viewBox="0 0 64 64" fill="none">
          <path
            d="M9 47 L27 13 L36 30"
            stroke="#8fb0ff"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="41" cy="41" r="11" stroke="#c6b6ff" strokeWidth="7" />
          <line x1="49" y1="49" x2="56" y2="56" stroke="#c6b6ff" strokeWidth="7" strokeLinecap="round" />
        </svg>
        <div
          style={{
            marginTop: 36,
            fontSize: 76,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -1,
          }}
        >
          Alloqo
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 28,
            fontWeight: 500,
            color: "#d6dbff",
          }}
        >
          Intelligent Investment
        </div>
      </div>
    ),
    { ...size }
  );
}
