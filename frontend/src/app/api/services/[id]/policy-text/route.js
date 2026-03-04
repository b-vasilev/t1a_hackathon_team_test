export async function GET(request, { params }) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const { id } = await params;

  let res;
  try {
    res = await fetch(`${backendUrl}/api/services/${id}/policy-text`);
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
