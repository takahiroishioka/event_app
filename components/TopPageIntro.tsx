import { youtubeVideoId } from "@/lib/youtube";

export default function TopPageIntro({ title, description, youtubeUrl }: {
  title: string;
  description: string;
  youtubeUrl?: string | null;
}) {
  const videoId = youtubeUrl ? youtubeVideoId(youtubeUrl) : null;
  return (
    <section className="bg-white px-4 py-16 text-neutral-900 sm:px-6 sm:py-20">
      <div className={`mx-auto max-w-6xl ${videoId ? "grid items-center gap-8 lg:grid-cols-2 lg:gap-12" : ""}`}>
        {videoId && <div className="aspect-video overflow-hidden rounded-2xl bg-neutral-900">
          <iframe src={`https://www.youtube.com/embed/${videoId}`} title={`${title}のYouTube動画`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="h-full w-full border-0" />
        </div>}
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-widest text-blue-600">EVENTS</p>
          <h1 className="mt-4 break-words text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl whitespace-pre-wrap break-words text-base leading-7 text-neutral-600">{description}</p>
        </div>
      </div>
    </section>
  );
}
