import { ImageResponse } from "next/og";
export const alt = "イベント申し込みサイト";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div style={{width:"100%",height:"100%",display:"flex",flexDirection:"column",justifyContent:"center",padding:"80px",background:"linear-gradient(135deg,#eff6ff,#ffffff 55%,#dbeafe)",color:"#111827"}}>
      <div style={{fontSize:28,fontWeight:700,color:"#2563eb",letterSpacing:4}}>EVENT APPLICATION</div>
      <div style={{marginTop:28,fontSize:76,fontWeight:900}}>イベント申し込みサイト</div>
      <div style={{marginTop:28,fontSize:32,color:"#4b5563"}}>開催予定のイベントを確認して、参加を申し込めます。</div>
    </div>, size
  );
}