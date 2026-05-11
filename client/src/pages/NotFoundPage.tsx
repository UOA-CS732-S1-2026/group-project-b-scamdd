import { useNavigate } from 'react-router-dom';
import MarketingLayout from '../components/MarketingLayout';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <MarketingLayout>
      <div className="max-w-4xl mx-auto px-6 py-4 min-h-[calc(100vh-180px)] flex items-center">
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-6 items-center w-full">
          <div className="relative flex items-center justify-center">
            <img
              src="/felt-logo.svg"
              alt=""
              aria-hidden
              className="absolute inset-0 m-auto w-[300px] md:w-[460px] h-auto opacity-90 select-none pointer-events-none"
              draggable={false}
            />
            <div className="relative text-center">
              <div
                aria-hidden
                className="text-[110px] md:text-[140px] leading-none font-bold text-[var(--c-text)] select-none"
              >
                404
              </div>
              <p className="text-2xl font-semibold text-[var(--c-text)] mt-1">
                Page not Found.
              </p>
            </div>
          </div>
          <div>
            <p className="text-5xl font-bold text-[var(--c-text)] mb-4">Oops!</p>
            <p className="text-lg text-[var(--c-text-2)] leading-relaxed mb-4 whitespace-nowrap">
              We couldn&apos;t find the page you were looking for.
            </p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-[20px] text-sm font-medium bg-[var(--c-text)] text-[var(--c-bg)] border border-[var(--c-text)] hover:opacity-90 cursor-pointer transition-opacity"
            >
              <span aria-hidden>←</span>
              Go home
            </button>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
