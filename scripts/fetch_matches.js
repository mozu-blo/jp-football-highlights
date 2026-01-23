const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE = "https://v3.football.api-sports.io";

async function api(path, params) {
  if (!API_KEY) throw new Error("API_FOOTBALL_KEY is not set");
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}${path}?${qs}`;
  const res = await fetch(url, { headers: { "x-apisports-key": API_KEY } });
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function main() {
  // まず status（ここが取れるならキーは確実にOK）
  const status = await api("/status", {});
  console.log("[status]");
  console.log(JSON.stringify(status, null, 2));

  const leagueId = 39;

  // leagues（シーズン確認）
  const leagues = await api("/leagues", { id: String(leagueId) });
  console.log("\n[leagues raw]");
  console.log(JSON.stringify(leagues, null, 2));

  // fixtures: next
  const nextRes = await api("/fixtures", {
    league: String(leagueId),
    season: "2025",
    next: "10"
  });
  console.log("\n[fixtures next raw]");
  console.log(JSON.stringify(nextRes, null, 2));

  // fixtures: last
  const lastRes = await api("/fixtures", {
    league: String(leagueId),
    season: "2025",
    last: "10"
  });
  console.log("\n[fixtures last raw]");
  console.log(JSON.stringify(lastRes, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
