import MarketingLayout from '../components/MarketingLayout';
import Highlight from '../components/Highlight';

export default function AboutPage() {
  return (
    <MarketingLayout>
      <article className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[var(--c-text)] tracking-tight mb-6">
          About <Highlight>felt</Highlight>
        </h1>
        <p
          className="text-base sm:text-lg text-[var(--c-text-2)] leading-relaxed"
          style={{ marginBottom: '36px' }}
        >
          We&apos;re building a different kind of finance tracker — one that pairs every
          purchase with how it made you feel.
        </p>

        <Section title="Our mission">
          Money management should be more than spreadsheets and numbers. We believe that
          understanding the emotional side of spending helps you make better financial
          decisions. felt helps you see not just where your money goes, but how each
          purchase actually made you feel.
        </Section>

        <Section title="What we believe">
          Every purchase carries a feeling. That coffee might have felt necessary at 8am,
          but regretted by noon. The impulse buy that brought genuine joy. The
          &ldquo;essential&rdquo; expense that left you stressed. When you track both the
          transaction and the emotion, you start spending with more intention and less
          regret.
        </Section>

        <Section title="Why felt exists">
          Traditional finance apps focus on budgets and categories. But knowing you spent
          $200 on &ldquo;entertainment&rdquo; doesn&apos;t tell you if it was worth it.
          felt adds the missing piece: how you actually felt about each purchase. Over
          time, patterns emerge. You learn what brings value and what brings regret.
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
