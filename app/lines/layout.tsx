import { voiceMetadata } from "@/lib/voice-metadata";
import VoiceSiteFooter from "@/components/VoiceSiteFooter";

export const metadata = voiceMetadata;

export default function VoiceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<VoiceSiteFooter /></>;
}
