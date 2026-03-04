import { pdf } from '@react-pdf/renderer';
import CombinedReport from './CombinedReport';

export async function generateCombinedReport(results) {
  if (!results || results.length === 0) { return; }

  // Fetch policy text for all services in parallel
  const settled = await Promise.allSettled(
    results.map(async (result) => {
      const res = await fetch(`/api/services/${result.service_id}/policy-text`);
      if (!res.ok) { return { service_id: result.service_id, text: null }; }
      const text = await res.json();
      return { service_id: result.service_id, text };
    })
  );

  // Build policyTexts object keyed by service_id
  const policyTexts = {};
  for (const entry of settled) {
    if (entry.status === 'fulfilled' && entry.value) {
      policyTexts[entry.value.service_id] = entry.value.text;
    }
  }

  // Render PDF to blob
  const blob = await pdf(
    <CombinedReport results={results} policyTexts={policyTexts} />
  ).toBlob();

  // Trigger download
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'privacylens-combined-report.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
}
