"use client";

import ImageCarousel, { type CarouselImage } from "@/components/ImageCarousel";

export type Banner = {
  id: string;
  title: string;
  link_url: string;
  images: CarouselImage[];
};

export default function BannerSection({ banners }: { banners: Banner[] }) {
  if (banners.length === 0) return null;

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-12 sm:px-6 sm:pb-16 lg:grid-cols-2">
      {banners.map((banner) => banner.images.length > 0 && (
        <div key={banner.id} className="overflow-hidden rounded-2xl shadow-sm transition hover:shadow-md">
          <ImageCarousel images={banner.images} href={banner.link_url} />
          <span className="sr-only">{banner.title}</span>
        </div>
      ))}
    </section>
  );
}
