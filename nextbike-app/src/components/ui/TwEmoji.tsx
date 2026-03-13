/** Renders an emoji as a consistent Twemoji SVG, identical on every platform. */
export function TwEmoji({
  emoji,
  className,
}: {
  emoji: string;
  className?: string;
}) {
  const cp = [...emoji]
    .map((c) => c.codePointAt(0)!.toString(16))
    .filter((hex) => hex !== "fe0f") // strip variation selector-16
    .join("-");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cp}.svg`}
      alt={emoji}
      className={className}
      aria-hidden
    />
  );
}
