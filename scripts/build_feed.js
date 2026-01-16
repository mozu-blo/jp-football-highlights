import fs from "node:fs";

function main() {
  const now = new Date().toISOString();
  const out = {
    generated_at: now,
    items: [
      {
        player_name: "自動生成テスト",
        club: "Auto FC",
        league: "Premier League",
        home: "Auto Home",
        away: "Auto Away",
        kickoff_jst: "2026-01-03 23:00",
        score: { home: 1, away: 0
