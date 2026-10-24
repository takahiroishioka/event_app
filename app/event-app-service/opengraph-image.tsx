import { ImageResponse } from "next/og";
export const alt = "夢に必要なのは、コミュニティだ。イベント管理 × あなたに合わせた独自SNS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(<div style={{display:"flex",flexDirection:"column",justifyContent:"center",width:"100%",height:"100%",padding:70,color:"#17264b",background:"linear-gradient(120deg,#f8fbff,#ede9ff)",border:"16px solid #e0e7ff"}}><div style={{fontSize:23,color:"#5262ba",letterSpacing:5}}>SHIOKAN / EVENT × COMMUNITY</div><div style={{display:"flex",flexDirection:"column",marginTop:36,fontSize:65,fontWeight:900}}><span>夢に必要なのは、</span><span style={{color:"#4c58bf"}}>コミュニティだ。</span></div><div style={{marginTop:38,fontSize:28}}>イベント管理 × あなたに合わせた独自SNS</div></div>,size);
}
