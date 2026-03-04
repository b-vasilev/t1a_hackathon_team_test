import Link from 'next/link';
import RiskProfile from '@/components/RiskProfile';

async function fetchReport(id) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/api/reports/${id}`, { cache: 'no-store' });
    return { status: res.status, data: res.ok ? await res.json() : null };
  } catch {
    return { status: 503, data: null };
  }
}

export default async function SharedReportPage({ params }) {
  const { id } = await params;
  const { status, data } = await fetchReport(id);

  if (status === 404) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 gap-4">
        <p
          className="text-lg font-semibold"
          style={{ color: 'var(--pl-text)', fontFamily: 'var(--font-heading)' }}
          data-testid="not-found-message"
        >
          Report not found
        </p>
        <Link
          href="/"
          className="text-sm underline"
          style={{ color: 'var(--pl-accent)', fontFamily: 'var(--font-mono)' }}
        >
          Analyze your own &rarr;
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 gap-4">
        <p
          className="text-lg font-semibold"
          style={{ color: 'var(--pl-text)', fontFamily: 'var(--font-heading)' }}
          data-testid="error-message"
        >
          Unable to load report
        </p>
        <Link
          href="/"
          className="text-sm underline"
          style={{ color: 'var(--pl-accent)', fontFamily: 'var(--font-mono)' }}
        >
          Analyze your own &rarr;
        </Link>
      </main>
    );
  }

  const sharedDate = new Date(data.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="min-h-screen px-4 py-8 max-w-4xl mx-auto flex flex-col gap-6">
      <div
        data-testid="shared-banner"
        className="rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm flex-wrap"
        style={{
          background: 'rgba(0, 210, 255, 0.08)',
          border: '1px solid rgba(0, 210, 255, 0.2)',
          color: 'var(--pl-text-muted)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)' }}>
          Shared on {sharedDate} &middot; Read-only snapshot
        </span>
        <Link
          href="/"
          className="text-sm hover:underline shrink-0"
          style={{ color: 'var(--pl-accent)', fontFamily: 'var(--font-mono)' }}
        >
          Analyze your own &rarr;
        </Link>
      </div>

      <RiskProfile overallGrade={data.overall_grade} results={data.results} />
    </main>
  );
}
