type SocialFooterSettings = {
  brand_name: string;
  instagram_url: string | null;
  x_url: string | null;
  youtube_url: string | null;
};

export default function SocialFooter({ settings }: { settings: SocialFooterSettings }) {
  const links = [
    { label: "Instagram", href: settings.instagram_url, icon: <InstagramIcon /> },
    { label: "X", href: settings.x_url, icon: <XIcon /> },
    { label: "YouTube", href: settings.youtube_url, icon: <YouTubeIcon /> },
  ].filter((link) => Boolean(link.href));

  return (
    <footer className="border-y border-neutral-200 bg-white px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
        <p className="text-xl font-black tracking-wider text-neutral-900">{settings.brand_name}</p>
        {links.length > 0 && (
          <div className="flex items-center gap-5">
            {links.map((link) => (
              <a key={link.label} href={link.href!} target="_blank" rel="noreferrer" aria-label={link.label} className="text-neutral-900 transition hover:text-blue-600">
                {link.icon}
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}

function InstagramIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm10.5 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" /></svg>;
}

function XIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.39L6.49 22H3.38l7.23-8.26L2.97 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.84h1.72L8.43 4.05H6.58L17.8 19.84Z" /></svg>;
}

function YouTubeIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 fill-current"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z" /></svg>;
}
