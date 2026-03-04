import { pdf } from '@react-pdf/renderer';
import PolicyReport from './PolicyReport';

export async function generateReport(result) {
  // Fetch policy text (optional — PDF works without it)
  let policyText = null;
  try {
    const res = await fetch(`/api/services/${result.service_id}/policy-text`);
    if (res.ok) {
      policyText = await res.json();
    }
  } catch {
    // Policy text unavailable — continue without it
  }

  // Render PDF to blob
  const blob = await pdf(
    <PolicyReport result={result} policyText={policyText} />
  ).toBlob();

  // Trigger download
  const url = URL.createObjectURL(blob);
  const slug = result.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${slug}-privacy-report.pdf`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
