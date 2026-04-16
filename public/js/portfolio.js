// ── Sector → display color ────────────────────────────────────────────────────
const SECTOR_COLORS = {
  'Tech':           'hsl(217,100%,68%)',
  'Semiconductors': 'hsl(27,100%,62%)',
  'Healthcare':     'hsl(330,100%,65%)',
  'Consumer':       'hsl(142,100%,62%)',
  'Finance':        'hsl(264,100%,72%)',
  'Energy':         'hsl(50,100%,65%)',
  'Industrial':     'hsl(190,80%,65%)',
  'Other':          'rgba(120,120,130,0.85)',
  'Cash':           '#3a3a3a',
}

// Map frontend tile key → API slug (tile key "gpt4o" → API "gpt")
const API_SLUG_MAP = {
  claude:   'claude',
  gpt4o:    'gpt',
  gemini:   'gemini',
  grok:     'grok',
  deepseek: 'deepseek',
  llama:    'llama',
  qwen:     'qwen',
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtUSD(val, forceSign = false) {
  if (val === null || val === undefined) return 'N/A'
  const sign = forceSign ? (val >= 0 ? '+' : '') : (val < 0 ? '-' : '')
  const abs = Math.abs(val)
  const str = abs >= 1000
    ? '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    : '$' + abs.toFixed(2)
  return sign + str
}
function fmtPct(val, decimals = 1, forceSign = false) {
  if (val === null || val === undefined) return 'N/A'
  const sign = forceSign ? (val >= 0 ? '+' : '') : (val < 0 ? '-' : '')
  return sign + Math.abs(val).toFixed(decimals) + '%'
}
function colorClass(val) {
  if (val === null || val === undefined) return ''
  return val >= 0 ? 'pos' : 'neg'
}
function tickerHue(ticker) {
  let h = 0
  for (let i = 0; i < ticker.length; i++) h = (h * 37 + ticker.charCodeAt(i)) % 360
  return h
}

// ── Stat card builder ─────────────────────────────────────────────────────────
function statCard(label, value, sub, valueClass) {
  const el = document.createElement('div')
  el.className = 'stat-card'
  el.innerHTML = `
    <div class="stat-label">${label}</div>
    <div class="stat-value ${valueClass ?? ''}">${value}</div>
    ${sub ? `<div class="stat-sub">${sub}</div>` : ''}
  `
  return el
}

// ── Logo with Clearbit fallback ───────────────────────────────────────────────
function holdingLogo(ticker, domain) {
  const hue = tickerHue(ticker)
  const initials = ticker.replace('-', '').slice(0, 3)
  const wrap = document.createElement('div')
  wrap.className = 'holding-logo-wrap'

  const img = document.createElement('img')
  img.className = 'holding-logo'
  img.src = `https://logo.clearbit.com/${domain}`
  img.alt = ticker
  img.loading = 'lazy'

  const fallback = document.createElement('div')
  fallback.className = 'holding-logo-fallback'
  fallback.textContent = initials
  fallback.style.background = `hsl(${hue},45%,15%)`
  fallback.style.borderColor = `hsl(${hue},60%,35%)`
  fallback.style.display = 'none'

  img.addEventListener('error', () => {
    img.style.display = 'none'
    fallback.style.display = 'flex'
  })

  wrap.appendChild(img)
  wrap.appendChild(fallback)
  return wrap
}

// ── Render portfolio (async, live data) ───────────────────────────────────────
async function renderPortfolio(tile) {
  const container = document.getElementById('portfolio-view')
  container.innerHTML = ''

  if (!tile) {
    const empty = document.createElement('div')
    empty.className = 'portfolio-empty'
    empty.innerHTML = `
      <div class="portfolio-empty-icon">◈</div>
      <div class="portfolio-empty-text">Select a model above<br>to view its portfolio</div>
    `
    container.appendChild(empty)
    return
  }

  // Loading skeleton
  const loading = document.createElement('div')
  loading.className = 'portfolio-loading'
  loading.textContent = 'Loading…'
  container.appendChild(loading)

  const key     = MODEL_KEY_MAP[tile.model]
  const apiSlug = API_SLUG_MAP[key] ?? key
  const f       = FACETS[tile.facet] ?? FACETS.slate

  let data
  try {
    const res = await fetch('/api/portfolio/' + apiSlug)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    data = await res.json()
  } catch (err) {
    container.innerHTML = ''
    const err_el = document.createElement('div')
    err_el.className = 'portfolio-empty'
    err_el.innerHTML = `
      <div class="portfolio-empty-icon" style="font-size:20px;opacity:0.4">⚠</div>
      <div class="portfolio-empty-text">Could not load portfolio</div>
    `
    container.appendChild(err_el)
    return
  }

  container.innerHTML = ''

  // ── Model header ────────────────────────────────────────────────────────────
  const header = document.createElement('div')
  header.className = 'pm-header'

  const iconEl = document.createElement('div')
  iconEl.className = 'pm-icon'
  iconEl.style.cssText = `
    background: linear-gradient(135deg, ${f.mid} 0%, ${f.base} 100%);
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 4px 14px -3px ${f.facet},
                inset 1.5px 2px 0.5px -0.5px rgba(255,255,255,0.85),
                inset -1.5px -2px 0.5px -0.5px rgba(0,0,0,0.4),
                inset 3px 3px 6px -2px rgba(255,255,255,0.25),
                inset -2px -2px 8px rgba(0,0,0,0.5),
                inset 0 0 0 1px rgba(255,255,255,0.12);
  `
  const glowTL = document.createElement('div')
  glowTL.className = 'pm-icon-glow-tl'
  glowTL.style.background = `radial-gradient(circle,white 0%,${f.facet} 30%,transparent 70%)`
  const glowBR = document.createElement('div')
  glowBR.className = 'pm-icon-glow-br'
  glowBR.style.background = `radial-gradient(circle,white 0%,${f.facet} 30%,transparent 70%)`
  const logoImg = document.createElement('img')
  logoImg.src = tile.logo
  logoImg.alt = tile.model
  iconEl.appendChild(glowTL)
  iconEl.appendChild(glowBR)
  iconEl.appendChild(logoImg)

  const returnUsd = data.total_return_usd
  const returnSign = returnUsd >= 0 ? '+' : ''
  const returnClass = returnUsd >= 0 ? 'pos' : 'neg'

  const infoEl = document.createElement('div')
  infoEl.className = 'pm-info'
  infoEl.innerHTML = `<div class="pm-model">${tile.model}</div>`

  const valuationEl = document.createElement('div')
  valuationEl.className = 'pm-valuation'
  valuationEl.innerHTML = `
    <div class="pm-total">${fmtUSD(data.total_value)}</div>
    <div class="pm-val-label ${returnClass}">${returnSign}${fmtUSD(Math.abs(returnUsd))} (${returnSign}${fmtPct(data.total_return_pct)})</div>
  `

  header.appendChild(iconEl)
  header.appendChild(infoEl)
  header.appendChild(valuationEl)
  container.appendChild(header)

  // ── Stats grid ──────────────────────────────────────────────────────────────
  const statsSection = document.createElement('div')
  statsSection.innerHTML = `<div class="section-label">Performance</div>`
  const grid = document.createElement('div')
  grid.className = 'stats-grid'

  const dailySign = (data.daily_pnl ?? 0) >= 0 ? '+' : ''

  grid.appendChild(statCard(
    'Total Return',
    `<span class="${returnClass}">${returnSign}${fmtUSD(Math.abs(returnUsd))}</span>`,
    `<span class="${returnClass}">${returnSign}${fmtPct(data.total_return_pct)}</span>`,
    ''
  ))
  grid.appendChild(statCard(
    'Daily P&L',
    `<span class="${colorClass(data.daily_pnl)}">${fmtUSD(data.daily_pnl, true)}</span>`,
    '',
    ''
  ))
  grid.appendChild(statCard('Beta', data.beta !== null ? data.beta.toFixed(2) : 'N/A', '', ''))
  grid.appendChild(statCard('Sharpe', data.sharpe_ratio !== null ? data.sharpe_ratio.toFixed(2) : 'N/A', '', ''))
  grid.appendChild(statCard('Win Rate', data.win_rate !== null ? fmtPct(data.win_rate, 0) : 'N/A', data.win_rate !== null ? 'closed trades' : 'no closed trades', ''))
  grid.appendChild(statCard(
    'Largest Pos.',
    data.largest_position ? data.largest_position.ticker : 'N/A',
    data.largest_position ? fmtPct(data.largest_position.pct_of_portfolio) + ' of portfolio' : '',
    ''
  ))
  grid.appendChild(statCard(
    'Avg Hold',
    data.avg_hold_days !== null ? data.avg_hold_days.toFixed(1) + 'd' : 'N/A',
    '',
    ''
  ))
  grid.appendChild(statCard(
    'Best Trade',
    data.best_trade ? `<span class="pos">${fmtUSD(data.best_trade.pnl, true)}</span>` : 'N/A',
    data.best_trade ? data.best_trade.ticker : '',
    ''
  ))
  grid.appendChild(statCard(
    'Worst Trade',
    data.worst_trade ? `<span class="neg">${fmtUSD(data.worst_trade.pnl, true)}</span>` : 'N/A',
    data.worst_trade ? data.worst_trade.ticker : '',
    ''
  ))

  statsSection.appendChild(grid)
  container.appendChild(statsSection)

  // ── Cash / Invested bar ─────────────────────────────────────────────────────
  const cashPct  = data.total_value > 0 ? (data.cash / data.total_value) * 100 : 100
  const invPct   = 100 - cashPct

  // Extract a solid accent color from the facet string (strip alpha, use full opacity)
  const accentMatch = f.facet.match(/rgba?\([\d,\s.]+\)/)
  const accentRaw   = f.facet.replace(/[\d.]+\)$/, '1)')

  const barSection = document.createElement('div')
  barSection.innerHTML = `<div class="section-label">Allocation</div>`
  const barWrap = document.createElement('div')
  barWrap.className = 'cash-bar-wrap'
  barWrap.innerHTML = `
    <div class="cash-bar">
      <div class="cash-bar-invested" style="width:${invPct.toFixed(1)}%;background:${accentRaw}"></div>
      <div class="cash-bar-cash"     style="width:${cashPct.toFixed(1)}%"></div>
    </div>
    <div class="cash-bar-labels">
      <span><span class="cash-bar-dot" style="background:${accentRaw}"></span>${fmtUSD(data.invested)} invested</span>
      <span><span class="cash-bar-dot" style="background:#4a4a4a"></span>${fmtUSD(data.cash)} cash</span>
    </div>
  `
  barSection.appendChild(barWrap)
  container.appendChild(barSection)

  // ── Sector donut ────────────────────────────────────────────────────────────
  const sectSection = document.createElement('div')
  sectSection.innerHTML = `<div class="section-label">Portfolio Sectors</div>`
  const sectRow = document.createElement('div')
  sectRow.className = 'sectors-row'

  const pieCanvas = document.createElement('canvas')
  pieCanvas.className = 'pie-canvas'
  sectRow.appendChild(pieCanvas)

  const legend = document.createElement('div')
  legend.className = 'sector-legend'

  const sectors = (data.sector_breakdown ?? []).map(s => ({
    name:  s.sector,
    pct:   s.pct,
    color: SECTOR_COLORS[s.sector] ?? SECTOR_COLORS.Other,
  }))

  sectors.forEach(s => {
    const item = document.createElement('div')
    item.className = 'sector-legend-item'
    item.innerHTML = `
      <span class="sector-dot" style="background:${s.color}"></span>
      <span class="sector-name">${s.name}</span>
      <span class="sector-pct">${s.pct}%</span>
    `
    legend.appendChild(item)
  })

  sectRow.appendChild(legend)
  sectSection.appendChild(sectRow)
  container.appendChild(sectSection)

  requestAnimationFrame(() => drawPieChart(pieCanvas, sectors))

  // ── Holdings list ───────────────────────────────────────────────────────────
  if (data.holdings && data.holdings.length > 0) {
    const holdSection = document.createElement('div')
    holdSection.innerHTML = `<div class="section-label">Holdings</div>`
    const holdList = document.createElement('div')
    holdList.className = 'holdings-list'

    // sort by market value desc
    const sorted = [...data.holdings].sort((a, b) => b.market_value - a.market_value)

    sorted.forEach(h => {
      const dayPos  = h.day_change_pct >= 0
      const pnlPos  = h.unrealized_pnl >= 0
      const pnlSign = pnlPos ? '+' : ''

      const row = document.createElement('div')
      row.className = 'holding-item'

      const logoWrap = holdingLogo(h.ticker, h.domain)

      const sectorColor = SECTOR_COLORS[h.sector] ?? SECTOR_COLORS.Other

      row.innerHTML = `
        <div class="holding-main">
          <div class="holding-top">
            <span class="holding-ticker">${h.ticker}</span>
            <span class="holding-name">${h.name}</span>
            <span class="holding-sector-tag" style="border-color:${sectorColor}40;color:${sectorColor}">${h.sector}</span>
          </div>
          <div class="holding-mid">${h.shares} sh &middot; ${fmtUSD(h.market_value)} &middot; ${fmtPct(h.pct_of_portfolio)} of portfolio</div>
          <div class="holding-bottom">
            <span class="holding-change ${dayPos ? 'pos' : 'neg'}">Today ${dayPos ? '+' : ''}${h.day_change_pct.toFixed(2)}%</span>
            <span class="holding-sep">·</span>
            <span class="holding-pnl ${pnlPos ? 'pos' : 'neg'}">
              ${pnlSign}${fmtPct(h.unrealized_pnl_pct)}&nbsp;(${pnlSign}${fmtUSD(Math.abs(h.unrealized_pnl))})
            </span>
          </div>
          <div class="holding-detail">
            Avg ${fmtUSD(h.avg_cost)} &rarr; ${fmtUSD(h.current_price)}
          </div>
        </div>
        <div class="holding-right">
          <div class="holding-mv">${fmtUSD(h.market_value)}</div>
          <div class="holding-pct ${dayPos ? 'pos' : 'neg'}">${dayPos ? '+' : ''}${h.day_change_pct.toFixed(2)}%</div>
        </div>
      `
      // Prepend logo (it's a DOM node, not HTML string)
      row.insertBefore(logoWrap, row.firstChild)
      holdList.appendChild(row)
    })

    holdSection.appendChild(holdList)
    container.appendChild(holdSection)
  }
}

// ── Neon donut chart (animated clockwise reveal) ──────────────────────────────
function drawPieChart(canvas, sectors) {
  const dpr  = window.devicePixelRatio || 1
  const SIZE = 110
  canvas.width  = SIZE * dpr
  canvas.height = SIZE * dpr
  canvas.style.width  = SIZE + 'px'
  canvas.style.height = SIZE + 'px'

  const ctx    = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const cx     = SIZE / 2
  const cy     = SIZE / 2
  const outerR = 47
  const innerR = 25
  const gap    = 0.04

  const segs = []
  let angle = -Math.PI / 2
  sectors.forEach(s => {
    const sweep = (s.pct / 100) * Math.PI * 2 - gap
    segs.push({ color: s.color, start: angle, sweep })
    angle += sweep + gap
  })

  const DURATION = 900
  const startTime = performance.now()

  function frame(now) {
    const t        = Math.min((now - startTime) / DURATION, 1)
    const progress = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    const revealed = -Math.PI / 2 + progress * Math.PI * 2

    ctx.clearRect(0, 0, SIZE, SIZE)

    segs.forEach(seg => {
      const segEnd = seg.start + seg.sweep
      if (revealed <= seg.start) return
      const drawEnd = Math.min(segEnd, revealed)

      for (let pass = 0; pass < 2; pass++) {
        ctx.save()
        ctx.shadowColor = seg.color
        if (pass === 0) { ctx.shadowBlur = 18; ctx.globalAlpha = 0.55 }
        else            { ctx.shadowBlur = 7;  ctx.globalAlpha = 1 }
        ctx.fillStyle = seg.color
        ctx.beginPath()
        ctx.arc(cx, cy, outerR, seg.start, drawEnd)
        ctx.arc(cx, cy, innerR, drawEnd, seg.start, true)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
    })

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerR)
    grad.addColorStop(0, 'rgba(0,0,0,0.9)')
    grad.addColorStop(1, 'rgba(0,0,0,0.55)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2)
    ctx.fill()

    if (t < 1) requestAnimationFrame(frame)
  }

  requestAnimationFrame(frame)
}
