export async function POST(request) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const body = await request.json();

  let res;
  try {
    res = await fetch(`${backendUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
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
