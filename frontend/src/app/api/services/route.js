export async function GET() {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
  const res = await fetch(`${backendUrl}/api/services`, { cache: 'no-store' });
  const data = await res.json();
  return Response.json(data);
}
