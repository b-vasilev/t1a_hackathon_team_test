export async function DELETE() {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';

  let res;
  try {
    res = await fetch(`${backendUrl}/api/cache`, {
      method: 'DELETE',
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
