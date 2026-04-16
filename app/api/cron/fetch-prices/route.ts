import { NextRequest, NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { supabase } from "@/lib/supabase";
import { UNIVERSE, UNIVERSE_TICKERS } from "@/lib/universe";

export const maxDuration = 300;

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Round a Date down to the nearest 5-minute boundary (for upsert key).
function floor5min(d: Date): string {
  const ms = 5 * 60 * 1000;
  return new Date(Math.floor(d.getTime() / ms) * ms).toISOString();
}

// Returns true if the current ET wall-clock time is within regular trading hours.
function isMarketHours(): boolean {
  const etStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const et = new Date(etStr);
  const mins = et.getHours() * 60 + et.getMinutes();
  return mins >= 9 * 60 + 30 && mins < 16 * 60; // 9:30 AM – 4:00 PM ET
}

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMarketHours()) {
    return NextResponse.json({ skipped: true, reason: "Outside market hours" });
  }

  const ts = floor5min(new Date());
  console.log(`[fetch-prices] Run at ${ts} — fetching ${UNIVERSE_TICKERS.length} tickers`);

  // ── 1. Fetch quotes ──────────────────────────────────────────────────────
  const quoteResults = await Promise.allSettled(
    UNIVERSE.map(async ({ ticker }) => {
      const q = await yf.quote(ticker);
      return {
        ticker,
        ts,
        open:   q.regularMarketOpen   ?? null,
        high:   q.regularMarketDayHigh ?? null,
        low:    q.regularMarketDayLow  ?? null,
        close:  q.regularMarketPrice   ?? null,
        volume: q.regularMarketVolume  ?? null,
      };
    })
  );

  const rows = quoteResults
    .filter((r): r is PromiseFulfilledResult<ReturnType<typeof Object.assign>> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((r) => r.close !== null);

  const failed = quoteResults
    .map((r, i) => (r.status === "rejected" ? UNIVERSE[i].ticker : null))
    .filter(Boolean);

  if (failed.length) console.warn(`[fetch-prices] Failed tickers: ${failed.join(", ")}`);
  console.log(`[fetch-prices] Fetched ${rows.length}/${UNIVERSE_TICKERS.length} quotes`);

  // ── 2. Upsert price_history ──────────────────────────────────────────────
  const { error: upsertErr } = await supabase
    .from("price_history")
    .upsert(rows, { onConflict: "ticker,ts" });

  if (upsertErr) {
    console.error("[fetch-prices] Upsert error:", upsertErr.message);
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }

  // ── 3. Build close price map ─────────────────────────────────────────────
  const closeMap = new Map<string, number>(
    rows.map((r) => [r.ticker, r.close as number])
  );

  // ── 4. Snapshot each model's portfolio value ─────────────────────────────
  const { data: models, error: modelsErr } = await supabase
    .from("models")
    .select("id, slug")
    .eq("active", true);

  if (modelsErr || !models?.length) {
    console.warn("[fetch-prices] No active models found — skipping snapshots");
    return NextResponse.json({ prices_inserted: rows.length, snapshots: 0 });
  }

  const snapshots: { model_id: string; ts: string; total_value: number; cash: number }[] = [];

  for (const model of models) {
    const { data: holdings } = await supabase
      .from("portfolios")
      .select("ticker, shares, avg_cost")
      .eq("model_id", model.id);

    const positions = holdings ?? [];
    const totalCostBasis = positions.reduce((s, h) => s + h.shares * h.avg_cost, 0);
    const cash = 100_000 - totalCostBasis;
    const equityValue = positions.reduce((s, h) => {
      const price = closeMap.get(h.ticker) ?? h.avg_cost;
      return s + h.shares * price;
    }, 0);
    const totalValue = cash + equityValue;

    snapshots.push({ model_id: model.id, ts, total_value: totalValue, cash });
  }

  const { error: snapErr } = await supabase.from("portfolio_snapshots").insert(snapshots);
  if (snapErr) console.error("[fetch-prices] Snapshot insert error:", snapErr.message);

  console.log(`[fetch-prices] Done — ${rows.length} prices, ${snapshots.length} snapshots`);
  return NextResponse.json({ prices_inserted: rows.length, snapshots: snapshots.length });
}
