import MarketingLayout from '../components/MarketingLayout';
import Highlight from '../components/Highlight';

export default function ContactPage() {
  return (
    <MarketingLayout>
      <article className="max-w-5xl mx-auto px-6 pt-6 pb-2">
        <h1 className="text-4xl md:text-5xl font-bold text-[var(--c-text)] tracking-tight mb-6">
          Contact <Highlight>&amp;</Highlight> feedback
        </h1>
        <p
          className="text-lg text-[var(--c-text-2)] leading-relaxed"
          style={{ marginBottom: '36px' }}
        >
          We&apos;d love to hear from you. Whether you have questions, feedback, or just
          want to say hi.
        </p>

        <div className="flex flex-wrap gap-3 text-sm text-[var(--c-text)] mb-10">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#4B4B4B]"
            style={{ background: '#ffffff' }}
          >
            <IconMail />
            contact@felt.co.nz
          </span>
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#4B4B4B]"
            style={{ background: '#ffffff' }}
          >
            <IconPhone />
            0800 373 7550
          </span>
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#4B4B4B]"
            style={{ background: '#ffffff' }}
          >
            <IconAt />
            feltbusiness
          </span>
        </div>

        <Section title="Get in touch">
          Have a question about how felt works? Running into a bug? Want to suggest a
          feature? We&apos;re here to help. Send us an email at{' '}
          <a
            href="mailto:hello@felt.app"
            className="font-semibold text-[var(--c-text-2)] hover:underline"
          >
            hello@felt.app
          </a>{' '}
          and we&apos;ll get back to you as soon as we can.
        </Section>

        <Section title="Share your feedback">
          felt is built for people who want to understand their relationship with money.
          Your feedback shapes how we build the product. Tell us what&apos;s working,
          what&apos;s confusing, or what features would make felt more useful for you.
          Every piece of feedback gets read by our team.
        </Section>

        <Section title="Report a bug">
          Found something that&apos;s not working right? We want to know. When reporting a
          bug, it helps if you can tell us what you were doing when it happened, what you
          expected to happen, and what actually happened. Screenshots are always
          appreciated too.
        </Section>

        <Section title="Business inquiries">
          For partnerships, press inquiries, or other business related questions, reach
          out to{' '}
          <a
            href="mailto:business@felt.co.nz"
            className="font-semibold text-[var(--c-text-2)] hover:underline"
          >
            business@felt.co.nz
          </a>
          . We typically respond within 1–2 business days.
        </Section>
      </article>
    </MarketingLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-[var(--c-text)] mb-2">{title}</h2>
      <p className="text-[var(--c-text-2)] leading-relaxed">{children}</p>
    </section>
  );
}

function IconMail() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M2.5 4.5L8 9l5.5-4.5" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 2.5h2.5l1 3-1.5 1a8 8 0 0 0 4.5 4.5l1-1.5 3 1V13a1.5 1.5 0 0 1-1.5 1.5A11 11 0 0 1 1.5 4 1.5 1.5 0 0 1 3 2.5z" />
    </svg>
  );
}

function IconAt() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="2.5" />
      <path d="M10.5 8v1.5a1.5 1.5 0 0 0 3 0V8a5.5 5.5 0 1 0-2.2 4.4" />
    </svg>
  );
}
