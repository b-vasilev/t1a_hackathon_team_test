const REPORT_ID_RE = /^[a-f0-9]{12}$/;

export async function GET(request, { params }) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const { id } = await params;

  if (!REPORT_ID_RE.test(id)) {
    return Response.json({ detail: 'Invalid report ID format' }, { status: 400 });
  }

  let res;
  try {
    res = await fetch(`${backendUrl}/api/reports/${id}`);
  } catch (err) {
    return Response.json({ detail: `Backend unreachable: ${err.message}` }, { status: 502 });
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { detail: text || 'Unknown error from backend' };
  }

  return Response.json(data, { status: res.status });
}
