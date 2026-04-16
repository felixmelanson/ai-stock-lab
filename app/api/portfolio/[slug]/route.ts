import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { UNIVERSE, UniverseTicker } from "@/lib/universe";

// ── Static data maps ──────────────────────────────────────────────────────────

const LOGO_MAP: Record<string, string> = {
  claude:   "/assets/company-logos/claude.svg",
  gpt:      "/assets/company-logos/chatgpt.webp",
  gemini:   "/assets/company-logos/gemini.png",
  grok:     "/assets/company-logos/grokwhite.png",
  deepseek: "/assets/company-logos/deepseek.png",
  llama:    "/assets/company-logos/meta.png",
  qwen:     "/assets/company-logos/qwen.webp",
};

// Approximate 5-year betas vs S&P 500 for all S&P 100 components.
const BETA: Record<string, number> = {
  // Tech
  AAPL: 1.20, MSFT: 1.15, GOOGL: 1.10, AMZN: 1.25, META: 1.30,
  TSLA: 2.30, NFLX: 1.40, CRM: 1.25, ADBE: 1.20, CSCO: 0.90,
  IBM: 0.85, ACN: 1.00, INTU: 1.10, NOW: 1.30, ORCL: 0.90,
  UBER: 1.45, PANW: 1.50,
  // Semiconductors
  NVDA: 2.00, AVGO: 1.20, AMD: 2.00, TXN: 1.10, QCOM: 1.30,
  AMAT: 1.70, MU: 1.80, LRCX: 1.80, ADI: 1.20, KLAC: 1.70, NXPI: 1.50,
  // Healthcare
  LLY: 0.60, UNH: 0.65, JNJ: 0.65, ABBV: 0.65, MRK: 0.60, PFE: 0.60,
  TMO: 1.00, ABT: 0.70, DHR: 1.00, AMGN: 0.75, ISRG: 1.10, GILD: 0.65,
  VRTX: 0.80, BMY: 0.60, REGN: 0.85, MDT: 0.80, CVS: 0.70, ELV: 0.85,
  CI: 0.75, HUM: 0.70,
  // Consumer
  WMT: 0.50, COST: 0.75, HD: 1.00, KO: 0.60, PEP: 0.60, PM: 0.55,
  MCD: 0.70, LOW: 1.00, MO: 0.50, NKE: 0.95, SBUX: 0.90, TGT: 1.10,
  PG: 0.55, KHC: 0.65,
  // Finance
  "BRK-B": 0.90, JPM: 1.10, V: 0.95, MA: 0.95, BAC: 1.15, WFC: 1.15,
  GS: 1.20, MS: 1.15, BLK: 1.25, SCHW: 1.20, AXP: 1.10, C: 1.20,
  SPGI: 1.10, COF: 1.30, CB: 0.80, USB: 1.00,
  // Energy
  XOM: 1.00, CVX: 0.95, SLB: 1.50, COP: 1.10, NEE: 0.45, SO: 0.35,
  DUK: 0.35, EOG: 1.20,
  // Industrial
  GE: 1.20, CAT: 1.20, RTX: 0.90, HON: 0.90, ETN: 1.05, LMT: 0.80,
  DE: 1.10, UPS: 0.95, MMM: 0.95, ITW: 1.05, EMR: 1.00, BA: 1.25,
  // Other
  T: 0.65, VZ: 0.45,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const universeMap = new Map<string, UniverseTicker>(UNIVERSE.map((u) => [u.ticker, u]));

/** FIFO matching of BUY/SELL trades → closed-position P&L records. */
function computeClosedTrades(
  trades: Array<{ action: string; ticker: string; shares: number; price: number; timestamp: string }>
) {
  const queues: Record<string, Array<{ shares: number; price: number; ts: number }>> = {};
  const closed: Array<{ ticker: string; pnl: number; holdDays: number }> = [];

  for (const t of trades) {
    if (!t.ticker || !t.shares || !t.price) continue;
    if (!queues[t.ticker]) queues[t.ticker] = [];
    const tradets = new Date(t.timestamp).getTime();

    if (t.action === "BUY") {
      queues[t.ticker].push({ shares: t.shares, price: t.price, ts: tradets });
    } else if (t.action === "SELL") {
      let remaining = t.shares;
      while (remaining > 0 && queues[t.ticker].length > 0) {
        const lot = queues[t.ticker][0];
        const matched = Math.min(remaining, lot.shares);
        closed.push({
          ticker: t.ticker,
          pnl: (t.price - lot.price) * matched,
          holdDays: (tradets - lot.ts) / 86_400_000,
        });
        lot.shares -= matched;
        remaining -= matched;
        if (lot.shares === 0) queues[t.ticker].shift();
      }
    }
  }

  return closed;
}

// ── Route handler ─────────────────────────────────────────────────────────────

type Params = Promise<{ slug: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { slug } = await params;

  // ── 1. Model ───────────────────────────────────────────────────────────────
  const { data: model, error: modelErr } = await supabase
    .from("models")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (modelErr || !model) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  // ── 2. Holdings ────────────────────────────────────────────────────────────
  const { data: holdingRows } = await supabase
    .from("portfolios")
    .select("ticker, shares, avg_cost")
    .eq("model_id", model.id);

  const holdings = holdingRows ?? [];
  const heldTickers = holdings.map((h) => h.ticker);

  // ── 3. Price data (last 2 calendar days for held tickers) ─────────────────
  const latestClose: Record<string, number> = {};
  const dayChangeMap: Record<string, number> = {};

  if (heldTickers.length > 0) {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const { data: priceRows } = await supabase
      .from("price_history")
      .select("ticker, ts, close")
      .in("ticker", heldTickers)
      .gte("ts", twoDaysAgo)
      .order("ticker")
      .order("ts", { ascending: false });

    if (priceRows) {
      const byTicker: Record<string, typeof priceRows> = {};
      for (const r of priceRows) {
        if (!byTicker[r.ticker]) byTicker[r.ticker] = [];
        byTicker[r.ticker].push(r);
      }
      for (const [ticker, rows] of Object.entries(byTicker)) {
        latestClose[ticker] = rows[0].close; // desc order → first = latest
        // Group by date, take most-recent close per day
        const byDate: Record<string, number> = {};
        for (const r of rows) {
          const date = r.ts.slice(0, 10);
          if (!(date in byDate)) byDate[date] = r.close;
        }
        const dates = Object.keys(byDate).sort().reverse();
        if (dates.length >= 2) {
          dayChangeMap[ticker] =
            ((byDate[dates[0]] - byDate[dates[1]]) / byDate[dates[1]]) * 100;
        }
      }
    }
  }

  // ── 4. Compute portfolio metrics ──────────────────────────────────────────
  const totalCostBasis = holdings.reduce((s, h) => s + h.shares * h.avg_cost, 0);
  const cash = 100_000 - totalCostBasis;

  const holdingDetails = holdings.map((h) => {
    const u = universeMap.get(h.ticker);
    const currentPrice = latestClose[h.ticker] ?? h.avg_cost;
    const marketValue = h.shares * currentPrice;
    return {
      ticker: h.ticker,
      name: u?.name ?? h.ticker,
      sector: u?.sector ?? "Other",
      domain: u?.domain ?? "",
      shares: h.shares,
      avg_cost: h.avg_cost,
      current_price: currentPrice,
      market_value: marketValue,
      pct_of_portfolio: 0, // filled after total is known
      unrealized_pnl: (currentPrice - h.avg_cost) * h.shares,
      unrealized_pnl_pct: ((currentPrice - h.avg_cost) / h.avg_cost) * 100,
      day_change_pct: dayChangeMap[h.ticker] ?? 0,
    };
  });

  const equityValue = holdingDetails.reduce((s, h) => s + h.market_value, 0);
  const totalValue = cash + equityValue;
  const invested = equityValue;

  for (const h of holdingDetails) {
    h.pct_of_portfolio = totalValue > 0 ? (h.market_value / totalValue) * 100 : 0;
  }

  const totalReturnUsd = totalValue - 100_000;
  const totalReturnPct = (totalReturnUsd / 100_000) * 100;

  // Largest position
  let largestPosition: { ticker: string; pct_of_portfolio: number } | null = null;
  if (holdingDetails.length > 0) {
    const lp = holdingDetails.reduce((mx, h) =>
      h.pct_of_portfolio > mx.pct_of_portfolio ? h : mx
    );
    largestPosition = { ticker: lp.ticker, pct_of_portfolio: lp.pct_of_portfolio };
  }

  // Beta (weighted avg by market value)
  let beta: number | null = null;
  if (equityValue > 0) {
    beta = holdingDetails.reduce((sum, h) => {
      const w = h.market_value / equityValue;
      return sum + w * (BETA[h.ticker] ?? 1.0);
    }, 0);
  }

  // Sector breakdown
  const sectorValues: Record<string, number> = { Cash: cash };
  for (const h of holdingDetails) {
    sectorValues[h.sector] = (sectorValues[h.sector] ?? 0) + h.market_value;
  }
  const sectorBreakdown = Object.entries(sectorValues)
    .filter(([, v]) => v > 0 && totalValue > 0)
    .map(([sector, value]) => ({
      sector,
      pct: Math.round((value / totalValue) * 1000) / 10,
    }))
    .sort((a, b) => b.pct - a.pct);

  // ── 5. Portfolio snapshots ─────────────────────────────────────────────────
  const { data: snapshots } = await supabase
    .from("portfolio_snapshots")
    .select("ts, total_value")
    .eq("model_id", model.id)
    .order("ts", { ascending: true });

  const snapshotHistory = (snapshots ?? []).map((s) => ({
    timestamp: s.ts,
    total_value: s.total_value,
  }));

  // Daily P&L
  let dailyPnl: number | null = null;
  if (snapshots && snapshots.length >= 2) {
    const today = new Date().toISOString().slice(0, 10);
    const todaySnaps = snapshots.filter((s) => s.ts.slice(0, 10) === today);
    const prevSnaps = snapshots.filter((s) => s.ts.slice(0, 10) < today);
    if (todaySnaps.length > 0 && prevSnaps.length > 0) {
      dailyPnl =
        todaySnaps[todaySnaps.length - 1].total_value -
        prevSnaps[prevSnaps.length - 1].total_value;
    }
  }

  // Sharpe ratio from daily EOD values
  let sharpeRatio: number | null = null;
  if (snapshots && snapshots.length > 5) {
    const byDate: Record<string, number> = {};
    for (const s of snapshots) {
      byDate[s.ts.slice(0, 10)] = s.total_value; // last write = EOD (ascending order)
    }
    const dailyValues = Object.values(byDate);
    if (dailyValues.length >= 3) {
      const returns: number[] = [];
      for (let i = 1; i < dailyValues.length; i++) {
        returns.push((dailyValues[i] - dailyValues[i - 1]) / dailyValues[i - 1]);
      }
      const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
      const variance =
        returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      if (stdDev > 0) sharpeRatio = (mean / stdDev) * Math.sqrt(252);
    }
  }

  // ── 6. Trade log analysis (FIFO closed-trade P&L) ─────────────────────────
  const { data: trades } = await supabase
    .from("trade_log")
    .select("action, ticker, shares, price, timestamp")
    .eq("model_id", model.id)
    .in("action", ["BUY", "SELL"])
    .not("ticker", "is", null)
    .not("price", "is", null)
    .order("timestamp", { ascending: true });

  let winRate: number | null = null;
  let avgHoldDays: number | null = null;
  let bestTrade: { ticker: string; pnl: number } | null = null;
  let worstTrade: { ticker: string; pnl: number } | null = null;

  if (trades && trades.length > 0) {
    const closedTrades = computeClosedTrades(
      trades as Array<{ action: string; ticker: string; shares: number; price: number; timestamp: string }>
    );

    if (closedTrades.length > 0) {
      const wins = closedTrades.filter((t) => t.pnl > 0).length;
      winRate = (wins / closedTrades.length) * 100;
      avgHoldDays =
        closedTrades.reduce((s, t) => s + t.holdDays, 0) / closedTrades.length;

      const sorted = [...closedTrades].sort((a, b) => b.pnl - a.pnl);
      bestTrade = { ticker: sorted[0].ticker, pnl: sorted[0].pnl };
      worstTrade = {
        ticker: sorted[sorted.length - 1].ticker,
        pnl: sorted[sorted.length - 1].pnl,
      };
    }
  }

  // ── Response ───────────────────────────────────────────────────────────────
  return NextResponse.json({
    model_slug: model.slug,
    display_name: model.name,
    logo_url: LOGO_MAP[model.slug] ?? "",
    total_value: totalValue,
    cash,
    invested,
    total_return_pct: totalReturnPct,
    total_return_usd: totalReturnUsd,
    daily_pnl: dailyPnl,
    beta,
    sharpe_ratio: sharpeRatio,
    win_rate: winRate,
    largest_position: largestPosition,
    avg_hold_days: avgHoldDays,
    best_trade: bestTrade,
    worst_trade: worstTrade,
    holdings: holdingDetails,
    sector_breakdown: sectorBreakdown,
    snapshot_history: snapshotHistory,
  });
}
