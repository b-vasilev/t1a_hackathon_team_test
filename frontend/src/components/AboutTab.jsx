import Image from 'next/image';
export default function AboutTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', alignItems: 'center', paddingTop: '20px' }}>
      {/* Hero */}
      <header className="hero-section relative flex flex-col gap-5 text-center items-center self-center" style={{ width: '100%', maxWidth: '960px' }}>
        <Image
          src="/policy-icon.svg"
          alt="PrivacyLens icon"
          className="relative z-1"
          width={80}
          height={92}
          priority
          style={{
            animation: 'fadeInUp 0.6s ease forwards',
            opacity: 0,
            filter: 'drop-shadow(0 0 20px rgba(90, 186, 187, 0.3))',
          }}
        />
        <h1
          className="hero-title text-5xl md:text-6xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          PrivacyLens
        </h1>
        <p
          className="text-2xl md:text-3xl font-semibold tracking-tight"
          style={{
            fontFamily: 'var(--font-heading)',
            color: 'var(--pl-text)',
            animation: 'fadeInUp 0.6s ease forwards',
            animationDelay: '0.1s',
            opacity: 0,
          }}
        >
          Know what you&apos;re agreeing to
        </p>
        <p
          className="max-w-md"
          style={{
            color: 'var(--pl-text-muted)',
            fontSize: '1.05rem',
            lineHeight: 1.6,
            animation: 'fadeInUp 0.6s ease forwards',
            animationDelay: '0.2s',
            opacity: 0,
          }}
        >
          AI-powered privacy policy analysis that grades the services you use every day — in plain English.
        </p>

        {/* Trust chips */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            animation: 'fadeInUp 0.6s ease forwards',
            animationDelay: '0.3s',
            opacity: 0,
          }}
        >
          {[
            { icon: '\u25C8', label: 'No account needed' },
            { icon: '\u25C7', label: 'Free' },
            { icon: '\u2B21', label: 'AI-powered' },
          ].map((chip) => (
            <span
              key={chip.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: 'rgba(0, 229, 255, 0.06)',
                border: '1px solid rgba(0, 229, 255, 0.15)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--pl-text-muted)',
                letterSpacing: '0.02em',
              }}
            >
              <span style={{ color: 'var(--pl-accent)', fontSize: '0.7rem' }}>{chip.icon}</span>
              {chip.label}
            </span>
          ))}
        </div>
      </header>

      {/* How it works */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          width: '100%',
          maxWidth: '640px',
          animation: 'fadeInUp 0.5s ease forwards',
          animationDelay: '0.4s',
          opacity: 0,
        }}
        className="hero-steps-grid self-center"
      >
        {[
          {
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            ),
            title: 'Select services',
            desc: 'Pick from popular apps or paste any URL',
          },
          {
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ),
            title: 'Scan policies',
            desc: 'AI reads and grades each policy A+ to F',
          },
          {
            icon: (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
              </svg>
            ),
            title: 'Understand risk',
            desc: 'Get a plain-English risk profile',
          },
        ].map((step) => (
          <div
            key={step.title}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              padding: '20px 12px',
              borderRadius: '14px',
              border: '1px solid var(--pl-border)',
              background: 'var(--pl-surface)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(0, 229, 255, 0.08)',
                border: '1px solid rgba(0, 229, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--pl-accent)',
              }}
            >
              {step.icon}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--pl-text)', fontFamily: 'var(--font-heading)' }}>
              {step.title}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--pl-text-dim)', lineHeight: 1.4 }}>
              {step.desc}
            </span>
          </div>
        ))}
      </div>

      {/* Why it matters — stat chips */}
      <div
        className="self-center"
        style={{
          display: 'flex',
          gap: '10px',
          width: '100%',
          maxWidth: '640px',
          animation: 'fadeInUp 0.5s ease forwards',
          animationDelay: '0.5s',
          opacity: 0,
        }}
      >
        {[
          {
            stat: '91%',
            text: 'accept policies without reading',
            href: 'https://www.lawyer-monthly.com/2018/08/do-you-accept-the-terms-conditions-or-do-they-need-to-change/',
            source: 'Deloitte, 2017',
          },
          {
            stat: '9%',
            text: 'always read policies before agreeing',
            href: 'https://www.pewresearch.org/internet/2019/11/15/americans-attitudes-and-experiences-with-privacy-policies-and-laws/',
            source: 'Pew Research, 2019',
          },
        ].map((item) => (
          <a
            key={item.stat}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid var(--pl-border)',
              background: 'var(--pl-surface)',
              textDecoration: 'none',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--pl-accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--pl-border)'; }}
          >
            <span
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                color: 'var(--pl-accent)',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {item.stat}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--pl-text)', fontWeight: 500, lineHeight: 1.3 }}>
                {item.text}
              </span>
              <span style={{ fontSize: '0.62rem', color: 'var(--pl-text-dim)', fontFamily: 'var(--font-mono)' }}>
                {item.source}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
