export async function GET() {
  return Response.json({
    ok: true,
    searchMode: "sample",
    piRate: "1 Pi = $314159",
  });
}

export default async function handler(_req, res) {
  const response = await GET();
  const body = await response.text();
  res.status(response.status).setHeader("Content-Type", "application/json").send(body);
}
