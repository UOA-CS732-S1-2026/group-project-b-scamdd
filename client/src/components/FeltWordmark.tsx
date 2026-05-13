import { useState } from 'react';

export default function FeltWordmark({
  size = 'md',
  className = '',
  showText = true,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const imgClass = size === 'sm' ? 'h-5' : size === 'lg' ? 'h-12' : 'h-7';
  const textClass = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-3xl' : 'text-xl';
  const dotClass = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';

  return (
    <span
      className={`inline-flex items-center gap-2 font-bold tracking-tight text-[var(--c-text)] ${textClass} ${className}`}
    >
      {imgFailed ? (
        <span
          aria-hidden
          className={`inline-block rounded-full bg-[var(--c-accent)] ${dotClass}`}
        />
      ) : (
        <img
          src="/felt-logo.svg"
          alt=""
          aria-hidden
          className={`${imgClass} w-auto select-none`}
          onError={() => setImgFailed(true)}
          draggable={false}
        />
      )}
      {showText && <span className="hidden sm:inline">felt</span>}
    </span>
  );
}
