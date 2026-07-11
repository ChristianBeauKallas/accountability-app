export function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={url} alt={name} />;
  }
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return <span className="avatar avatar-fallback">{initial}</span>;
}
