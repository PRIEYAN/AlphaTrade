export function Marquee({ items }: { items: string[] }) {
  const loop = [...items, ...items];
  return (
    <div className="border-y-[3px] border-ink bg-lime overflow-hidden">
      <div className="flex whitespace-nowrap animate-marquee py-2 font-display uppercase tracking-wider text-sm">
        {loop.map((t, i) => (
          <span key={i} className="px-6 flex items-center gap-6">
            <span>★</span>
            <span>{t}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
