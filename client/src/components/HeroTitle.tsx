interface HeroTitleProps {
  highlight: string;
  rest?: string;
  subtitle?: string;
}

export default function HeroTitle({ highlight, rest, subtitle }: HeroTitleProps) {
  return (
    <div>
      <h1 className="text-4xl md:text-5xl font-extrabold m-0 leading-tight tracking-tight">
        <span className="inline-block px-4 py-1 rounded-2xl bg-[var(--c-accent)] text-[var(--c-tint-text)]">
          {highlight}
        </span>
        {rest && (
          <span className="ml-3 text-[var(--c-text)]">{rest}</span>
        )}
      </h1>
      {subtitle && (
        <p className="text-sm mt-3 text-[var(--c-text-2)]">{subtitle}</p>
      )}
    </div>
  );
}
