export type EventImageRow = {
  event_id: string | null;
  image_url: string;
};

export function attachEventPreviewImages<T extends { id: string }>(
  events: T[],
  imageRows: EventImageRow[]
): Array<T & { image_url: string | null }> {
  const firstImageByEvent = new Map<string, string>();

  for (const image of imageRows) {
    if (image.event_id && !firstImageByEvent.has(image.event_id)) {
      firstImageByEvent.set(image.event_id, image.image_url);
    }
  }

  return events.map((event) => ({
    ...event,
    image_url: firstImageByEvent.get(event.id) ?? null,
  }));
}
