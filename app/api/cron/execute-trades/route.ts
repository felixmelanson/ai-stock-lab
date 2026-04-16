import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { UNIVERSE, UNIVERSE_TICKERS } from "@/lib/universe";

export const maxDuration = 300;

// ── Types ────────────────────────────────────────────────────────────────────

type ModelCaller = (system: string, user: string) => Promise<string>;

interface Holding {
  ticker: string;
  shares: number;
  avg_cost: number;
}

interface PriceRow {
  ticker: string;
  ts: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
}

interface TradeInstruction {
  action: "buy" | "sell";
  ticker: string;
  shares: number;
  rationale: string;
}

interface ModelResponse {
  trades: TradeInstruction[];
  commentary: string;
}

// ── Session ──────────────────────────────────────────────────────────────────

function getSession(): { session: "morning" | "afternoon"; dateET: string } {
  const etStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const et = new Date(etStr);
  const session = et.getHours() < 12 ? "morning" : "afternoon";
  const dateET = et.toLocaleDateString("en-CA"); // YYYY-MM-DD
  return { session, dateET };
}

// ── Model dispatch ────────────────────────────────────────────────────────────

async function getModelCaller(slug: string): Promise<ModelCaller> {
  const map: Record<string, () => Promise<{ callModel: (prompt: string) => Promise<string> }>> = {
    claude:   () => import("@/lib/models/claude"),
    gpt:      () => import("@/lib/models/gpt"),
    gemini:   () => import("@/lib/models/gemini"),
    grok:     () => import("@/lib/models/grok"),
    deepseek: () => import("@/lib/models/deepseek"),
    llama:    () => import("@/lib/models/llama"),
    qwen:     () => import("@/lib/models/qwen"),
  };
  const loader = map[slug.toLowerCase()];
  if (!loader) throw new Error(`Unknown model slug: ${slug}`);
  const mod = await loader();
  // Existing model files take a single combined prompt; we concatenate system + user.
  return (system: string, user: string) => mod.callModel(`${system}\n\n${user}`);
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildUniverseBlock(): string {
  return UNIVERSE.map((u) => `${u.ticker.padEnd(6)} | ${u.name.padEnd(30)} | ${u.sector}`).join("\n");
}

function formatDailyContext(
  allPriceRows: PriceRow[],
  todayET: string
): string {
  // Group rows by ticker → date → rows (take last close per day for daily, all for intraday)
  const byTicker = new Map<string, PriceRow[]>();
  for (const row of allPriceRows) {
    const arr = byTicker.get(row.ticker) ?? [];
    arr.push(row);
    byTicker.set(row.ticker, arr);
  }

  const lines: string[] = ["DAILY CLOSES (last 5 sessions, newest first):"];
  lines.push("Ticker | " + Array.from({ length: 5 }, (_, i) => `Day-${i + 1}`).join(" | "));

  for (const ticker of UNIVERSE_TICKERS) {
    const rows = byTicker.get(ticker) ?? [];
    // Group by calendar date, take last row per day
    const byDate = new Map<string, PriceRow>();
    for (const r of rows) {
      const date = r.ts.slice(0, 10);
      if (date < todayET) byDate.set(date, r); // only historical days
    }
    const days = Array.from(byDate.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // newest first
      .slice(0, 5);

    if (days.length === 0) continue;
    const closes = days.map(([, r]) => `$${r.close.toFixed(2)}`).join(" | ");
    lines.push(`${ticker.padEnd(6)} | ${closes}`);
  }

  return lines.join("\n");
}

function formatIntradayContext(
  allPriceRows: PriceRow[],
  heldTickers: string[],
  todayET: string
): string {
  if (heldTickers.length === 0) return "";
  const lines = ["TODAY INTRADAY (held positions):"];
  for (const ticker of heldTickers) {
    const rows = allPriceRows
      .filter((r) => r.ticker === ticker && r.ts.slice(0, 10) === todayET)
      .sort((a, b) => a.ts.localeCompare(b.ts));
    if (rows.length === 0) continue;
    lines.push(`  ${ticker}:`);
    for (const r of rows) {
      const time = r.ts.slice(11, 16);
      lines.push(`    ${time} | O:$${r.open?.toFixed(2) ?? "?"} H:$${r.high?.toFixed(2) ?? "?"} L:$${r.low?.toFixed(2) ?? "?"} C:$${r.close.toFixed(2)} V:${r.volume?.toLocaleString() ?? "?"}`);
    }
  }
  return lines.join("\n");
}

function buildPrompt(params: {
  modelName: string;
  session: "morning" | "afternoon";
  dateET: string;
  holdings: Holding[];
  cash: number;
  totalValue: number;
  priceRows: PriceRow[];
}): { system: string; user: string } {
  const { modelName, session, dateET, holdings, cash, totalValue, priceRows } = params;

  // Current price of each held ticker (latest row)
  const latestClose = new Map<string, number>();
  for (const r of priceRows) {
    const prev = latestClose.get(r.ticker);
    if (!prev || r.ts > (priceRows.find((x) => x.ticker === r.ticker && x.close === prev)?.ts ?? "")) {
      latestClose.set(r.ticker, r.close);
    }
  }

  const holdingsBlock = holdings.length === 0
    ? "  (no positions — fully in cash)"
    : holdings.map((h) => {
        const price = latestClose.get(h.ticker) ?? h.avg_cost;
        const unrealizedPnl = (price - h.avg_cost) * h.shares;
        const pnlSign = unrealizedPnl >= 0 ? "+" : "";
        return `  ${h.ticker.padEnd(6)} | ${h.shares} shares | avg $${h.avg_cost.toFixed(2)} | now $${price.toFixed(2)} | P&L: ${pnlSign}$${unrealizedPnl.toFixed(2)}`;
      }).join("\n");

  const dailyCtx = formatDailyContext(priceRows, dateET);
  const intradayCtx = formatIntradayContext(priceRows, holdings.map((h) => h.ticker), dateET);

  const system =
    `You are ${modelName} competing in a live AI stock trading competition. You started with $100,000.\n\n` +
    `COMPETITION RULES:\n` +
    `- You trade twice daily: morning session (9:45am ET) and afternoon session (3:45pm ET)\n` +
    `- You may hold positions overnight\n` +
    `- Maximum 25% of portfolio in any single stock\n` +
    `- You can hold cash — no requirement to be fully invested\n` +
    `- Your goal is to maximize total portfolio value over the competition period\n\n` +
    `UNIVERSE: You may only trade tickers from this list:\n` +
    buildUniverseBlock() + "\n\n" +
    `Respond ONLY with valid JSON matching the exact schema specified. No markdown, no preamble, no explanation outside the JSON.`;

  const user =
    `YOUR CURRENT STATE:\n` +
    `Cash:              $${cash.toFixed(2)}\n` +
    `Total value:       $${totalValue.toFixed(2)}\n` +
    `Holdings:\n${holdingsBlock}\n\n` +
    `MARKET CONTEXT:\n` +
    dailyCtx + "\n" +
    (intradayCtx ? "\n" + intradayCtx + "\n" : "") +
    `\nSESSION: ${session}, ${dateET}\n\n` +
    `REQUIRED RESPONSE FORMAT (JSON only, no markdown):\n` +
    `{\n` +
    `  "trades": [\n` +
    `    { "action": "buy", "ticker": "AAPL", "shares": 10, "rationale": "..." },\n` +
    `    { "action": "sell", "ticker": "MSFT", "shares": 5, "rationale": "..." }\n` +
    `  ],\n` +
    `  "commentary": "One sentence about overall strategy this session."\n` +
    `}\n` +
    `trades may be empty if you wish to hold. action must be "buy" or "sell" (lowercase).`;

  return { system, user };
}

// ── Response parsing ─────────────────────────────────────────────────────────

function parseResponse(raw: string): ModelResponse {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  // Extract outermost JSON object
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("No JSON object found in response");
  const parsed = JSON.parse(cleaned.slice(first, last + 1));
  if (!Array.isArray(parsed.trades)) throw new Error("Missing 'trades' array");
  return parsed as ModelResponse;
}

// ── Timeout wrapper ───────────────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { session, dateET } = getSession();
  console.log(`\n${"═".repeat(50)}`);
  console.log(` QuantDrift Execute-Trades — ${session} — ${dateET}`);
  console.log(`${"═".repeat(50)}\n`);

  // ── 1. Load models ───────────────────────────────────────────────────────
  const { data: models, error: modelsErr } = await supabase
    .from("models")
    .select("id, name, slug")
    .eq("active", true);

  if (modelsErr) return NextResponse.json({ error: modelsErr.message }, { status: 500 });
  if (!models?.length) return NextResponse.json({ error: "No active models" }, { status: 500 });

  // ── 2. Fetch market data from price_history ──────────────────────────────
  // Pull 7 calendar days to get at least 5 trading days + today's intraday.
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: priceRows, error: pricesErr } = await supabase
    .from("price_history")
    .select("ticker, ts, open, high, low, close, volume")
    .in("ticker", UNIVERSE_TICKERS)
    .gte("ts", since)
    .order("ticker")
    .order("ts");

  if (pricesErr) {
    console.error("[execute-trades] price_history fetch failed:", pricesErr.message);
  }

  const allPriceRows: PriceRow[] = (priceRows ?? []) as PriceRow[];

  // Build latest-close map from price_history
  const latestCloseMap = new Map<string, number>();
  for (const r of allPriceRows) {
    latestCloseMap.set(r.ticker, r.close); // rows are ordered by ts asc, so last write wins
  }

  // ── 3. Process each model ────────────────────────────────────────────────
  const summary: { model: string; success: boolean; trades: number; error?: string }[] = [];

  for (const model of models) {
    console.log(`\n${"─".repeat(40)}`);
    console.log(` ${model.name} (${model.slug})`);
    console.log(`${"─".repeat(40)}`);

    let promptText = "";
    let responseText = "";

    try {
      // ── Fetch holdings ─────────────────────────────────────────────────
      const { data: holdingRows, error: holdErr } = await supabase
        .from("portfolios")
        .select("ticker, shares, avg_cost")
        .eq("model_id", model.id);

      if (holdErr) throw new Error(`Holdings fetch failed: ${holdErr.message}`);

      const holdings: Holding[] = (holdingRows ?? []).map((h) => ({
        ticker: h.ticker,
        shares: h.shares,
        avg_cost: h.avg_cost,
      }));

      const totalCostBasis = holdings.reduce((s, h) => s + h.shares * h.avg_cost, 0);
      const cash = 100_000 - totalCostBasis;
      const equityValue = holdings.reduce((s, h) => {
        const price = latestCloseMap.get(h.ticker) ?? h.avg_cost;
        return s + h.shares * price;
      }, 0);
      const totalValue = cash + equityValue;

      console.log(`[${model.slug}] Cash: $${cash.toFixed(2)} | Equity: $${equityValue.toFixed(2)} | Total: $${totalValue.toFixed(2)}`);

      // ── Build + call model ─────────────────────────────────────────────
      const { system, user } = buildPrompt({
        modelName: model.name,
        session,
        dateET,
        holdings,
        cash,
        totalValue,
        priceRows: allPriceRows,
      });

      promptText = `SYSTEM:\n${system}\n\nUSER:\n${user}`;
      const caller = await getModelCaller(model.slug);
      responseText = await withTimeout(caller(system, user), 60_000);

      console.log(`[${model.slug}] Response (${responseText.length} chars)`);

      // ── Parse response ─────────────────────────────────────────────────
      let parsed: ModelResponse;
      try {
        parsed = parseResponse(responseText);
      } catch (e) {
        throw new Error(`Parse failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      // ── Validate & execute trades ──────────────────────────────────────
      const universeSet = new Set(UNIVERSE_TICKERS);
      const holdingsMap = new Map(holdings.map((h) => [h.ticker, { ...h }]));
      let cashRemaining = cash;
      let tradesExecuted = 0;

      for (const trade of parsed.trades) {
        const { action, ticker, shares, rationale } = trade;

        if (!["buy", "sell"].includes(action)) {
          console.warn(`[${model.slug}] Invalid action "${action}" for ${ticker} — skipped`);
          continue;
        }
        if (!universeSet.has(ticker)) {
          console.warn(`[${model.slug}] "${ticker}" not in universe — skipped`);
          continue;
        }
        if (typeof shares !== "number" || shares <= 0 || !Number.isFinite(shares)) {
          console.warn(`[${model.slug}] Invalid share count ${shares} for ${ticker} — skipped`);
          continue;
        }

        const price = latestCloseMap.get(ticker);
        if (!price) {
          console.warn(`[${model.slug}] No price data for ${ticker} — skipped`);
          continue;
        }

        if (action === "sell") {
          const held = holdingsMap.get(ticker);
          if (!held || held.shares < shares) {
            console.warn(`[${model.slug}] Cannot sell ${shares} ${ticker} — only ${held?.shares ?? 0} held`);
            continue;
          }

          const newShares = held.shares - shares;
          if (newShares === 0) {
            const { error } = await supabase
              .from("portfolios")
              .delete()
              .eq("model_id", model.id)
              .eq("ticker", ticker);
            if (error) { console.error(`[${model.slug}] DB delete error:`, error.message); continue; }
            holdingsMap.delete(ticker);
          } else {
            const { error } = await supabase
              .from("portfolios")
              .update({ shares: newShares })
              .eq("model_id", model.id)
              .eq("ticker", ticker);
            if (error) { console.error(`[${model.slug}] DB update error:`, error.message); continue; }
            held.shares = newShares;
          }

          cashRemaining += shares * price;
          tradesExecuted++;
          console.log(`[${model.slug}] SELL ${shares} ${ticker} @ $${price.toFixed(2)}`);
        }

        if (action === "buy") {
          const cost = shares * price;
          if (cost > cashRemaining) {
            console.warn(`[${model.slug}] Insufficient cash for ${shares} ${ticker} ($${cost.toFixed(2)} > $${cashRemaining.toFixed(2)}) — skipped`);
            continue;
          }

          // 25% position limit check
          const existingShares = holdingsMap.get(ticker)?.shares ?? 0;
          const newPositionValue = (existingShares + shares) * price;
          if (newPositionValue / totalValue > 0.25) {
            console.warn(`[${model.slug}] ${ticker} would exceed 25% limit ($${newPositionValue.toFixed(2)} / $${totalValue.toFixed(2)}) — skipped`);
            continue;
          }

          const existing = holdingsMap.get(ticker);
          if (existing) {
            const totalShares = existing.shares + shares;
            const newAvgCost = (existing.shares * existing.avg_cost + shares * price) / totalShares;
            const { error } = await supabase
              .from("portfolios")
              .update({ shares: totalShares, avg_cost: newAvgCost })
              .eq("model_id", model.id)
              .eq("ticker", ticker);
            if (error) { console.error(`[${model.slug}] DB update error:`, error.message); continue; }
            existing.shares = totalShares;
            existing.avg_cost = newAvgCost;
          } else {
            const { error } = await supabase
              .from("portfolios")
              .insert({ model_id: model.id, ticker, shares, avg_cost: price });
            if (error) { console.error(`[${model.slug}] DB insert error:`, error.message); continue; }
            holdingsMap.set(ticker, { ticker, shares, avg_cost: price });
          }

          cashRemaining -= cost;
          tradesExecuted++;
          console.log(`[${model.slug}] BUY ${shares} ${ticker} @ $${price.toFixed(2)}`);
        }

        // Log to trade_log
        await supabase.from("trade_log").insert({
          model_id: model.id,
          phase: 1,
          action: action.toUpperCase(),
          ticker,
          shares,
          price,
          reasoning: rationale ?? null,
          full_prompt: promptText,
          full_response: responseText,
          timestamp: new Date().toISOString(),
        });
      }

      // ── Insert activity_feed row ───────────────────────────────────────
      const { error: feedErr } = await supabase.from("activity_feed").insert({
        model_slug: model.slug,
        ts: new Date().toISOString(),
        session,
        message: parsed.commentary ?? null,
        trades_json: parsed.trades,
      });
      if (feedErr) console.error(`[${model.slug}] activity_feed insert error:`, feedErr.message);

      console.log(`[${model.slug}] Done — ${tradesExecuted} trade(s) executed`);
      summary.push({ model: model.name, success: true, trades: tradesExecuted });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[${model.slug}] ERROR: ${message}`);

      // Log error to trade_log
      await supabase.from("trade_log").insert({
        model_id: model.id,
        phase: 1,
        action: "ERROR",
        ticker: null,
        shares: null,
        price: null,
        reasoning: message,
        full_prompt: promptText,
        full_response: responseText,
        timestamp: new Date().toISOString(),
      });

      summary.push({ model: model.name, success: false, trades: 0, error: message });
    }
  }

  console.log(`\n${"═".repeat(50)}`);
  console.log(` Execute-Trades Complete`);
  console.log(`${"═".repeat(50)}\n`);

  return NextResponse.json({ success: true, session, date: dateET, summary });
}
