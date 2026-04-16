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
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMarketHours()) {
    return NextResponse.json({ skipped: true, reason: "Outside market hours" });
  }

  const ts = floor5min(new Date());
  const todayET = new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // YYYY-MM-DD

  console.log(`[fetch-prices] Run at ${ts} — fetching ${UNIVERSE_TICKERS.length} tickers`);

  // ── 1. Fetch quotes ──────────────────────────────────────────────────────
  const quoteResults = await Promise.allSettled(
    UNIVERSE.map(async ({ ticker }) => {
      const q = await yf.quote(ticker);
      return {
        ticker,
        ts,
        open:       q.regularMarketOpen         ?? null,
        high:       q.regularMarketDayHigh       ?? null,
        low:        q.regularMarketDayLow        ?? null,
        close:      q.regularMarketPrice         ?? null,
        volume:     q.regularMarketVolume        ?? null,
        change_pct: q.regularMarketChangePercent ?? null,
      };
    })
  );

  const rows = quoteResults
    .filter(
      (r): r is PromiseFulfilledResult<ReturnType<typeof Object.assign>> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((r) => r.close !== null);

  const failed = quoteResults
    .map((r, i) => (r.status === "rejected" ? UNIVERSE[i].ticker : null))
    .filter(Boolean);

  if (failed.length) console.warn(`[fetch-prices] Failed tickers: ${failed.join(", ")}`);
  console.log(`[fetch-prices] Fetched ${rows.length}/${UNIVERSE_TICKERS.length} quotes`);

  // ── 2. Upsert price_history (new schema) ────────────────────────────────
  const { error: phErr } = await supabase
    .from("price_history")
    .upsert(
      rows.map(({ ticker, ts: rowTs, open, high, low, close, volume }) => ({
        ticker, ts: rowTs, open, high, low, close, volume,
      })),
      { onConflict: "ticker,ts" }
    );

  if (phErr) console.error("[fetch-prices] price_history upsert error:", phErr.message);

  // ── 3. Upsert daily_prices (old schema, has real data) ─────────────────
  const { error: dpErr } = await supabase
    .from("daily_prices")
    .upsert(
      rows.map(({ ticker, open, high, low, close, volume, change_pct }) => ({
        ticker,
        date: todayET,
        open,
        high,
        low,
        close,
        volume,
        change_pct,
      })),
      { onConflict: "ticker,date" }
    );

  if (dpErr) console.error("[fetch-prices] daily_prices upsert error:", dpErr.message);

  // ── 4. Build close price map ─────────────────────────────────────────────
  const closeMap = new Map<string, number>(
    rows.map((r) => [r.ticker, r.close as number])
  );

  // ── 5. Snapshot each model's portfolio value ─────────────────────────────
  // No active filter — old schema has no active column
  const { data: models, error: modelsErr } = await supabase
    .from("models")
    .select("id, slug");

  if (modelsErr || !models?.length) {
    console.warn("[fetch-prices] No models found — skipping snapshots");
    return NextResponse.json({ prices_inserted: rows.length, snapshots: 0 });
  }

  let snapshotCount = 0;

  for (const model of models) {
    const { data: holdings } = await supabase
      .from("portfolios")
      .select("ticker, shares, avg_cost")
      .eq("model_id", model.id);

    const positions = holdings ?? [];

    // Cash from model_accounts; fall back to cost-basis if row is missing
    const { data: accountRow } = await supabase
      .from("model_accounts")
      .select("cash")
      .eq("model_slug", model.slug)
      .single();

    const totalCostBasis = positions.reduce((s, h) => s + h.shares * h.avg_cost, 0);
    const cash = accountRow?.cash ?? 100_000 - totalCostBasis;

    const equityValue = positions.reduce((s, h) => {
      const price = closeMap.get(h.ticker) ?? h.avg_cost;
      return s + h.shares * price;
    }, 0);
    const totalValue = cash + equityValue;

    const { error: snapErr } = await supabase.from("portfolio_snapshots").insert({
      model_slug: model.slug,
      timestamp: ts,
      total_value: totalValue,
      cash,
      invested: equityValue,
    });

    if (snapErr) {
      console.error(`[fetch-prices] Snapshot error for ${model.slug}:`, snapErr.message);
    } else {
      snapshotCount++;
    }
  }

  console.log(`[fetch-prices] Done — ${rows.length} prices, ${snapshotCount} snapshots`);
  return NextResponse.json({ prices_inserted: rows.length, snapshots: snapshotCount });
}
