"use client";

import { useEffect, useState } from "react";

export type CarouselImage = {
  id: string;
  image_url: string;
  alt_text?: string | null;
};

export default function ImageCarousel({
  images,
  className = "",
}: {
  images: CarouselImage[];
  className?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((current) => (current + 1) % images.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) return null;

  const visibleIndex = currentIndex % images.length;

  const move = (direction: number) => {
    setCurrentIndex((current) =>
      (current + direction + images.length) % images.length
    );
  };

  return (
    <div className={`relative aspect-video overflow-hidden bg-neutral-200 ${className}`}>
      {images.map((image, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={image.id}
          src={image.image_url}
          alt={image.alt_text || ""}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            index === visibleIndex ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />
      ))}

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="前の画像"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-lg text-white transition hover:bg-black/75"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="次の画像"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 px-3 py-2 text-lg text-white transition hover:bg-black/75"
          >
            ›
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/45 px-3 py-2">
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
