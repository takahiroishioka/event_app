import { youtubeVideoId } from "@/lib/youtube";

export default function YouTubeEmbed({ url, title }: { url: string | null | undefined; title: string }) {
  const id = url ? youtubeVideoId(url) : null;
  if (!id) return null;
  return <section className="mt-7">
    <h2 className="mb-3 text-sm font-bold text-neutral-700">動画</h2>
    <div className="aspect-video min-h-[200px] overflow-hidden rounded-2xl bg-neutral-900">
      <iframe src={`https://www.youtube.com/embed/${id}`} title={`${title}のYouTube動画`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="h-full min-h-[200px] w-full border-0" />
    </div>
    <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-bold text-blue-700 underline">YouTubeで見る</a>
  </section>;
}
