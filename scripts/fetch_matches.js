import fs from "node:fs";

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

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

// リーグの現在シーズンを取る
async function resolveSeason(leagueId) {
  const json = await api("/leagues", { id: String(leagueId) });
  const league = json?.response?.[0]?.league;
  const seasons = json?.response?.[0]?.seasons || [];
  const current = seasons.find((s) => s.current === true);
  const maxYear = seasons.reduce((m, s) => Math.max(m, Number(s.year || 0)), 0);
  const season = current ? Number(current.year) : maxYear;

  console.log(`[season] leagueId=${leagueId} leagueName=${league?.name || "?"} resolved=${season}`);
  console.log(
    `[season candidates] ${seasons
      .slice(-10)
      .map((s) => `${s.year}${s.current ? "*" : ""}`)
      .join(", ")}`
  );

  if (!season) throw new Error(`Could not resolve season for league ${leagueId}`);
  return season;
}

async function main() {
  const leagues = loadJson("data/leagues.json");

  for (const lg of leagues) {
    console.log(`\n[league] ${lg.league} (id=${lg.id})`);

    const season = await resolveSeason(lg.id);

    // ★テスト1：日付指定なし（次の試合）
    const nextJson = await api("/fixtures", {
      league: String(lg.id),
      season: String(season),
      next: "10"
    });
    console.log(`[fixtures next=10] ${nextJson?.response?.length || 0}`);

    // ★テスト2：日付指定なし（直近の試合）
    const lastJson = await api("/fixtures", {
      league: String(lg.id),
      season: String(season),
      last: "10"
    });
    console.log(`[fixtures last=10] ${lastJson?.response?.length || 0}`);

    // ついでに1件だけ中身確認
    const one = lastJson?.response?.[0];
    if (one) {
      console.log(`[sample last fixture] ${one.teams?.home?.name} vs ${one.teams?.away?.name} @ ${one.fixture?.date}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
