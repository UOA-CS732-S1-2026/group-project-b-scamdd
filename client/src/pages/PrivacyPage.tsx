import MarketingLayout from '../components/MarketingLayout';
import Highlight from '../components/Highlight';

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <article className="max-w-5xl mx-auto px-6 pt-6 pb-2">
        <h1 className="text-4xl md:text-5xl font-bold text-[var(--c-text)] tracking-tight mb-6">
          Privacy <Highlight>&amp;</Highlight> Terms
        </h1>
        <p
          className="text-lg text-[var(--c-text-2)] leading-relaxed"
          style={{ marginBottom: '36px' }}
        >
          The plain-English version: we only ask for what we need, we never sell your
          data, and you can leave with everything you put in. The longer version follows.
        </p>

        <Section title="What we collect">
          Your name, email, and the transactions and moods you log. That&apos;s it — no
          third-party trackers, no shadow profiles.
        </Section>

        <Section title="How we use it">
          To show your spending and feelings back to you, and to make{' '}
          <span className="font-semibold text-[var(--c-text-2)]">felt</span> better. Nothing is
          sold, rented, or used for ad targeting.
        </Section>

        <Section title="Your rights">
          Export, edit, or delete everything from Settings → Your data. Under the NZ
          Privacy Act 2020 you can also email{' '}
          <a
            href="mailto:privacy@felt.co.nz"
            className="font-semibold text-[var(--c-text-2)] hover:underline"
          >
            privacy@felt.co.nz
          </a>{' '}
          and we&apos;ll respond within 10 working days.
        </Section>

        <Section title="Not financial advice">
          felt is a reflection tool, not a financial adviser. For decisions about debt,
          investing, or tax, talk to a qualified professional.
        </Section>

        <Section title="Acceptable use">
          Use felt for your own finances. Don&apos;t try to break it, scrape other
          people&apos;s data, or use the service for anything illegal.
        </Section>

        <Section title="Changes">
          We may update this page from time to time. The date above changes when we do,
          and we&apos;ll email you about anything material. Questions:{' '}
          <a
            href="mailto:privacy@felt.co.nz"
            className="font-semibold text-[var(--c-text-2)] hover:underline"
          >
            privacy@felt.co.nz
          </a>
          .
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
