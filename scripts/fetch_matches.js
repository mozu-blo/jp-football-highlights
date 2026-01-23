import fs from "node:fs";

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE = "https://v3.football.api-sports.io";

function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// JST基準で「今週の月〜日」
function weekRangeJST(now = new Date()) {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dow = jst.getUTCDay(); // 0=Sun..6=Sat
  const diffToMon = (dow + 6) % 7;
  const mon = new Date(jst);
  mon.setUTCDate(jst.getUTCDate() - diffToMon);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return { from: isoDate(mon), to: isoDate(sun) };
}

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

function uniq(arr) {
  return [...new Set(arr)];
}

async function main() {
  const players = loadJson("data/players.json");
  const leagues = loadJson("data/leagues.json");

  // club -> [player_id]
  const clubToPlayers = new Map();
  for (const p of players) {
    if (!clubToPlayers.has(p.club)) clubToPlayers.set(p.club, []);
    clubToPlayers.get(p.club).push(p.player_id);
  }

  const { from, to } = weekRangeJST();
  console.log(`[week] from=${from} to=${to}`);
  console.log(`[clubs in players.json] ${[...clubToPlayers.keys()].join(" | ")}`);

  const matches = [];

  for (const lg of leagues) {
    console.log(`\n[league] ${lg.league} (id=${lg.id}) season=2025`);

    const json = await api("/fixtures", {
      league: String(lg.id),
      season: "2025",
      from,
      to
    });

    const items = json?.response || [];
    console.log(`[fixtures returned] ${items.length}`);

    // ★デバッグ：今週返ってきた試合のクラブ名を全部見る（多すぎたら最初の30件だけ）
    const preview = items.slice(0, 30).map((f) => ({
      date: f.fixture?.date,
      home: f.teams?.home?.name,
      away: f.teams?.away?.name
    }));
    console.log(`[fixtures preview first ${preview.length}]`);
    console.log(JSON.stringify(preview, null, 2));

    for (const f of items) {
      const home = f.teams?.home?.name;
      const away = f.teams?.away?.name;

      const hit = [];
      if (clubToPlayers.has(home)) hit.push(...clubToPlayers.get(home));
      if (clubToPlayers.has(away)) hit.push(...clubToPlayers.get(away));
      if (hit.length === 0) continue;

      matches.push({
        match_id: f.fixture?.id,
        league: lg.league,
        kickoff_utc: f.fixture?.date,
        home,
        away,
        players: uniq(hit)
      });
    }

    console.log(`[matched] ${matches.length} (cumulative)`);
  }

  const out = { week_start: from, week_end: to, matches };
  fs.writeFileSync("data/matches.json", JSON.stringify(out, null, 2), "utf-8");
  console.log(`\nWrote data/matches.json (${matches.length} matches)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
