import type { Metadata } from "next";
import StudyRequestsPage from "@/components/StudyRequestsPage";

export const metadata: Metadata = {
  title: "勉強会開催希望一覧",
  description: "参加してみたい勉強会を選んで、開催希望をお送りください。",
  openGraph: { title: "勉強会開催希望一覧", description: "参加してみたい勉強会を選んで、開催希望をお送りください。", type: "website" },
};

export default function Page() { return <StudyRequestsPage />; }
