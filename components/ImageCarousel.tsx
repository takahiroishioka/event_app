"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type CarouselImage = {
  id: string;
  image_url: string;
  alt_text?: string | null;
  link_url?: string | null;
};

export default function ImageCarousel({
  images,
  className = "",
  href,
}: {
  images: CarouselImage[];
  className?: string;
  href?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlayStopped, setAutoPlayStopped] = useState(false);

  useEffect(() => {
    if (images.length < 2 || autoPlayStopped) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((current) => (current + 1) % images.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [autoPlayStopped, images.length]);

  if (images.length === 0) return null;

  const visibleIndex = currentIndex % images.length;

  const move = (direction: number) => {
    setCurrentIndex((current) =>
      (current + direction + images.length) % images.length
    );
  };

  return (
    <div
      className={`relative aspect-video overflow-hidden bg-neutral-200 ${className}`}
      onPointerDown={() => setAutoPlayStopped(true)}
    >
      {images.map((image, index) => {
        const imageElement = (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.image_url} alt={image.alt_text || ""} className="h-full w-full object-cover" />
        );
        const imageClass = `absolute inset-0 transition-opacity duration-500 ${index === visibleIndex ? "opacity-100" : "pointer-events-none opacity-0"}`;
        const imageHref = image.link_url || href;
        return imageHref ? (
          <Link key={image.id} href={imageHref} className={imageClass}>{imageElement}</Link>
        ) : (
          <div key={image.id} className={imageClass}>{imageElement}</div>
        );
      })}

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="前の画像"
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-lg text-white transition hover:bg-black/75"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="次の画像"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-lg text-white transition hover:bg-black/75"
          >
            ›
          </button>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-black/45 px-3 py-2">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                aria-label={`${index + 1}枚目を表示`}
                className={`h-2 w-2 rounded-full ${index === visibleIndex ? "bg-white" : "bg-white/45"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
