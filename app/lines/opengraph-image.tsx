import { ImageResponse } from "next/og";

export const alt = "こえらぼ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px", background: "linear-gradient(135deg,#eff6ff,#ffffff 55%,#e0e7ff)", color: "#111827" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#2563eb", letterSpacing: 4 }}>KOELABO</div>
      <div style={{ marginTop: 28, fontSize: 100, fontWeight: 900 }}>こえらぼ</div>
      <div style={{ marginTop: 28, fontSize: 36, color: "#4b5563" }}>セリフを見つけて、あなたの声を投稿。</div>
    </div>,
    size,
  );
}
