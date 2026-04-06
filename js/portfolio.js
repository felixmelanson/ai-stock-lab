// ── sector colors (consistent across all models) ───────────────────────────
const SC = {
  Tech:       'hsl(217,100%,68%)',
  Semi:       'hsl(27,100%,62%)',
  Cloud:      'hsl(174,100%,55%)',
  Health:     'hsl(330,100%,65%)',
  Consumer:   'hsl(142,100%,62%)',
  Finance:    'hsl(264,100%,72%)',
  Energy:     'hsl(50,100%,65%)',
  Social:     'hsl(10,100%,68%)',
  Ecom:       'hsl(290,100%,68%)',
  Space:      'hsl(200,100%,68%)',
  EV:         'hsl(160,100%,60%)',
  Enterprise: 'hsl(240,100%,70%)',
  Other:      'rgba(120,120,130,0.85)',
}

// ── portfolio data per model ────────────────────────────────────────────────
const PORTFOLIO_DATA = {
  claude: {
    developer:   'Anthropic',
    philosophy:  'Risk-balanced growth strategy. Prioritizes resilient blue-chip tech with selective exposure to high-growth semiconductors. Constitutional AI principles inform a measured, long-term holding approach.',
    concentration: 28,
    sectors: [
      { name: 'Technology',     pct: 35, color: SC.Tech     },
      { name: 'Semiconductors', pct: 22, color: SC.Semi     },
      { name: 'Healthcare',     pct: 15, color: SC.Health   },
      { name: 'Consumer',       pct: 13, color: SC.Consumer },
      { name: 'Finance',        pct: 10, color: SC.Finance  },
      { name: 'Other',          pct: 5,  color: SC.Other    },
    ],
    stocks: [
      { ticker: 'AAPL',  company: 'Apple',       qty: 200, pct: +2.1, dollar: '+$4,100', pos: true  },
      { ticker: 'NVDA',  company: 'NVIDIA',       qty: 120, pct: +8.4, dollar: '+$3,240', pos: true  },
      { ticker: 'MSFT',  company: 'Microsoft',    qty: 50,  pct: +4.2, dollar: '+$2,250', pos: true  },
      { ticker: 'CRM',   company: 'Salesforce',   qty: 90,  pct: +1.9, dollar: '+$2,700', pos: true  },
      { ticker: 'GOOGL', company: 'Alphabet',     qty: 30,  pct: +3.8, dollar: '+$2,640', pos: true  },
      { ticker: 'AMZN',  company: 'Amazon',       qty: 15,  pct: -0.8, dollar: '-$890',   pos: false },
    ],
  },
  gpt4o: {
    developer:   'OpenAI',
    philosophy:  'Momentum-driven strategy concentrated in AI infrastructure and cloud computing leaders. Leverages the Microsoft partnership for enterprise software positioning with tactical swing plays.',
    concentration: 42,
    sectors: [
      { name: 'Cloud / AI',     pct: 40, color: SC.Cloud  },
      { name: 'Technology',     pct: 28, color: SC.Tech   },
      { name: 'Semiconductors', pct: 20, color: SC.Semi   },
      { name: 'Other',          pct: 12, color: SC.Other  },
    ],
    stocks: [
      { ticker: 'MSFT',  company: 'Microsoft',    qty: 80,  pct: +4.2, dollar: '+$3,600', pos: true  },
      { ticker: 'AMZN',  company: 'Amazon',       qty: 40,  pct: +5.2, dollar: '+$1,920', pos: true  },
      { ticker: 'META',  company: 'Meta',          qty: 60,  pct: +6.1, dollar: '+$1,830', pos: true  },
      { ticker: 'NVDA',  company: 'NVIDIA',        qty: 35,  pct: +8.4, dollar: '+$1,260', pos: true  },
      { ticker: 'GOOG',  company: 'Alphabet',      qty: 20,  pct: +3.1, dollar: '+$820',   pos: true  },
      { ticker: 'TSLA',  company: 'Tesla',         qty: 85,  pct: -5.8, dollar: '-$1,105', pos: false },
    ],
  },
  gemini: {
    developer:   'Google DeepMind',
    philosophy:  'Diversified tech-forward approach leveraging domain knowledge in cloud, advertising tech, and enterprise SaaS. Systematic position sizing with sector rotation on quarterly earnings cycles.',
    concentration: 32,
    sectors: [
      { name: 'Technology',     pct: 38, color: SC.Tech       },
      { name: 'Cloud / AI',     pct: 25, color: SC.Cloud      },
      { name: 'Social / Ads',   pct: 18, color: SC.Social     },
      { name: 'Enterprise SaaS',pct: 12, color: SC.Enterprise },
      { name: 'Other',          pct: 7,  color: SC.Other      },
    ],
    stocks: [
      { ticker: 'META',  company: 'Meta',       qty: 200, pct: +6.1, dollar: '+$2,180', pos: true  },
      { ticker: 'GOOGL', company: 'Alphabet',   qty: 80,  pct: +3.8, dollar: '+$2,640', pos: true  },
      { ticker: 'SNOW',  company: 'Snowflake',  qty: 45,  pct: +7.2, dollar: '+$1,980', pos: true  },
      { ticker: 'MSFT',  company: 'Microsoft',  qty: 30,  pct: +4.2, dollar: '+$1,350', pos: true  },
      { ticker: 'CRM',   company: 'Salesforce', qty: 55,  pct: +1.9, dollar: '+$1,650', pos: true  },
      { ticker: 'NFLX',  company: 'Netflix',    qty: 100, pct: -4.2, dollar: '-$1,450', pos: false },
    ],
  },
  grok: {
    developer:   'xAI (Elon Musk)',
    philosophy:  'Contrarian macro strategy with concentration in EV, space tech, and disruptive plays. High-conviction, concentrated bets aligned with transformative technology adoption curves.',
    concentration: 78,
    sectors: [
      { name: 'EV / Clean',  pct: 35, color: SC.EV    },
      { name: 'Space Tech',  pct: 25, color: SC.Space  },
      { name: 'Cloud / AI',  pct: 28, color: SC.Cloud  },
      { name: 'Other',       pct: 12, color: SC.Other  },
    ],
    stocks: [
      { ticker: 'META',  company: 'Meta',       qty: 150, pct: +6.1, dollar: '+$3,750', pos: true  },
      { ticker: 'PLTR',  company: 'Palantir',   qty: 200, pct: +8.9, dollar: '+$3,120', pos: true  },
      { ticker: 'AMD',   company: 'AMD',         qty: 75,  pct: +4.5, dollar: '+$1,680', pos: true  },
      { ticker: 'NVDA',  company: 'NVIDIA',      qty: 15,  pct: +8.4, dollar: '+$540',   pos: true  },
      { ticker: 'TSLA',  company: 'Tesla',       qty: 60,  pct: -5.8, dollar: '-$2,100', pos: false },
      { ticker: 'RKLB',  company: 'Rocket Lab',  qty: 300, pct: -3.2, dollar: '-$1,440', pos: false },
    ],
  },
  deepseek: {
    developer:   'DeepSeek AI',
    philosophy:  'Asia-Pacific semiconductor supply chains and global chip infrastructure. Value-tilted position sizing with mean-reversion entries on oversold semiconductor names.',
    concentration: 62,
    sectors: [
      { name: 'Semiconductors', pct: 42, color: SC.Semi     },
      { name: 'Technology',     pct: 30, color: SC.Tech     },
      { name: 'Consumer',       pct: 18, color: SC.Consumer },
      { name: 'Other',          pct: 10, color: SC.Other    },
    ],
    stocks: [
      { ticker: 'NVDA',  company: 'NVIDIA',       qty: 110, pct: +8.4, dollar: '+$2,970', pos: true  },
      { ticker: 'TSM',   company: 'TSMC',          qty: 40,  pct: +5.3, dollar: '+$1,640', pos: true  },
      { ticker: 'QCOM',  company: 'Qualcomm',      qty: 55,  pct: +2.8, dollar: '+$1,210', pos: true  },
      { ticker: 'AMAT',  company: 'Applied Matls', qty: 30,  pct: +3.7, dollar: '+$870',   pos: true  },
      { ticker: 'AMZN',  company: 'Amazon',        qty: 60,  pct: -2.1, dollar: '-$890',   pos: false },
      { ticker: 'INTC',  company: 'Intel',         qty: 220, pct: -4.8, dollar: '-$1,540', pos: false },
    ],
  },
  llama: {
    developer:   'Meta AI',
    philosophy:  'Social-platform ecosystem strategy weighted toward digital advertising, AR/VR infrastructure, and consumer tech. Concentrates in Meta\'s direct competitive landscape and adjacent markets.',
    concentration: 70,
    sectors: [
      { name: 'Social / Ads',  pct: 40, color: SC.Social   },
      { name: 'Technology',    pct: 25, color: SC.Tech     },
      { name: 'Consumer',      pct: 20, color: SC.Consumer },
      { name: 'Cloud / AI',    pct: 10, color: SC.Cloud    },
      { name: 'Other',         pct: 5,  color: SC.Other    },
    ],
    stocks: [
      { ticker: 'META',  company: 'Meta',      qty: 90,  pct: +6.1,  dollar: '+$1,820', pos: true  },
      { ticker: 'AMD',   company: 'AMD',        qty: 25,  pct: +4.5,  dollar: '+$560',   pos: true  },
      { ticker: 'TSLA',  company: 'Tesla',      qty: 35,  pct: -5.8,  dollar: '-$1,890', pos: false },
      { ticker: 'AAPL',  company: 'Apple',      qty: 180, pct: -2.3,  dollar: '-$3,420', pos: false },
      { ticker: 'SNAP',  company: 'Snap Inc.',  qty: 500, pct: -8.4,  dollar: '-$2,100', pos: false },
      { ticker: 'PINS',  company: 'Pinterest',  qty: 200, pct: -2.9,  dollar: '-$1,200', pos: false },
    ],
  },
  qwen: {
    developer:   'Alibaba Cloud',
    philosophy:  'Concentrates in e-commerce infrastructure, Chinese tech ADRs, and global cloud platforms. Speculative positions in emerging market tech with a high-conviction China macro thesis.',
    concentration: 85,
    sectors: [
      { name: 'E-commerce',  pct: 45, color: SC.Ecom  },
      { name: 'Cloud / AI',  pct: 28, color: SC.Cloud },
      { name: 'Technology',  pct: 18, color: SC.Tech  },
      { name: 'Other',       pct: 9,  color: SC.Other },
    ],
    stocks: [
      { ticker: 'BABA',  company: 'Alibaba',   qty: 200, pct: -6.8, dollar: '-$4,100', pos: false },
      { ticker: 'JD',    company: 'JD.com',    qty: 300, pct: -4.1, dollar: '-$2,400', pos: false },
      { ticker: 'GOOGL', company: 'Alphabet',  qty: 60,  pct: -3.2, dollar: '-$2,835', pos: false },
      { ticker: 'MSFT',  company: 'Microsoft', qty: 60,  pct: -1.8, dollar: '-$2,100', pos: false },
      { ticker: 'AMZN',  company: 'Amazon',    qty: 20,  pct: -1.2, dollar: '-$890',   pos: false },
      { ticker: 'TCOM',  company: 'Trip.com',  qty: 150, pct: +2.8, dollar: '+$1,050', pos: true  },
    ],
  },
}

// ── model key mapping ────────────────────────────────────────────────────────
const MODEL_KEY_MAP = {
  'CLAUDE 3.5': 'claude',
  'GPT-4O':     'gpt4o',
  'GEMINI 2.0': 'gemini',
  'GROK 4.1':   'grok',
  'DEEPSEEK R1':   'deepseek',
  'LLAMA 3.1':  'llama',
  'QWEN 2.5':   'qwen',
}

// ── ticker color helper ─────────────────────────────────────────────────────
function tickerHue(ticker) {
  let h = 0
  for (let i = 0; i < ticker.length; i++) h = (h * 37 + ticker.charCodeAt(i)) % 360
  return h
}

// ── render portfolio ────────────────────────────────────────────────────────
function renderPortfolio(tile) {
  const container = document.getElementById('portfolio-view')
  container.innerHTML = ''

  // no tile selected → empty state
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

  const key  = MODEL_KEY_MAP[tile.model]
  const data = PORTFOLIO_DATA[key]
  if (!data) return

  const f = FACETS[tile.facet]

  // ── model header ──
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

  const infoEl = document.createElement('div')
  infoEl.className = 'pm-info'
  infoEl.innerHTML = `
    <div class="pm-model">${tile.model}</div>
    <div class="pm-dev">${data.developer}</div>
  `

  const valuationEl = document.createElement('div')
  valuationEl.className = 'pm-valuation'
  valuationEl.innerHTML = `
    <div class="pm-total">${tile.portfolio}</div>
    <div class="pm-val-label">Portfolio Valuation</div>
  `

  header.appendChild(iconEl)
  header.appendChild(infoEl)
  header.appendChild(valuationEl)
  container.appendChild(header)

  // ── trading philosophy ──
  const phil = document.createElement('div')
  phil.className = 'pm-philosophy'
  phil.textContent = data.philosophy
  container.appendChild(phil)

  // ── diversification bar ──
  const divSection = document.createElement('div')
  divSection.innerHTML = `<div class="section-label">Diversification Index</div>`
  const divWrap = document.createElement('div')
  divWrap.className = 'diversification-wrap'
  divWrap.innerHTML = `
    <div class="diversification-bar">
      <div class="diversification-indicator" style="left:0%"></div>
    </div>
    <div class="diversification-labels">
      <span>Diversified</span>
      <span>Concentrated</span>
    </div>
  `
  divSection.appendChild(divWrap)
  container.appendChild(divSection)

  // animate indicator after insertion
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const indicator = divWrap.querySelector('.diversification-indicator')
    if (indicator) indicator.style.left = data.concentration + '%'
  }))

  // ── portfolio sectors ──
  const sectSection = document.createElement('div')
  sectSection.innerHTML = `<div class="section-label">Portfolio Sectors</div>`
  const sectRow = document.createElement('div')
  sectRow.className = 'sectors-row'

  // pie chart canvas
  const pieCanvas = document.createElement('canvas')
  pieCanvas.className = 'pie-canvas'
  sectRow.appendChild(pieCanvas)

  // legend
  const legend = document.createElement('div')
  legend.className = 'sector-legend'
  data.sectors.forEach(s => {
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

  // draw pie after DOM insertion
  requestAnimationFrame(() => drawPieChart(pieCanvas, data.sectors))

  // ── stock holdings ──
  const stockSection = document.createElement('div')
  stockSection.innerHTML = `<div class="section-label">Stock Holdings</div>`
  const stockList = document.createElement('div')
  stockList.className = 'stocks-list'

  data.stocks.forEach(stock => {
    const hue    = tickerHue(stock.ticker)
    const bgColor = `hsl(${hue},55%,18%)`
    const borderColor = `hsl(${hue},70%,40%)`

    const item = document.createElement('div')
    item.className = 'stock-item'
    item.innerHTML = `
      <div class="stock-icon" style="background:${bgColor};border-color:${borderColor}40">${stock.ticker.slice(0,3)}</div>
      <div class="stock-info">
        <div class="stock-ticker">${stock.ticker}</div>
        <div class="stock-company">${stock.company}</div>
        <div class="stock-qty">${stock.qty} shares</div>
      </div>
      <div class="stock-right">
        <span class="stock-change-pct ${stock.pos ? 'up' : 'down'}">${stock.pct > 0 ? '+' : ''}${stock.pct}%</span>
        <span class="stock-delta ${stock.pos ? 'pos' : 'neg'}">${stock.dollar}</span>
      </div>
    `
    stockList.appendChild(item)
  })

  stockSection.appendChild(stockList)
  container.appendChild(stockSection)
}

// ── neon pie chart (animated clockwise reveal) ──────────────────────────────
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

  // pre-compute segment angles
  const segs = []
  let angle = -Math.PI / 2
  sectors.forEach(s => {
    const sweep = (s.pct / 100) * Math.PI * 2 - gap
    segs.push({ color: s.color, start: angle, sweep })
    angle += sweep + gap
  })

  const DURATION = 900  // ms
  const startTime = performance.now()

  function frame(now) {
    const t        = Math.min((now - startTime) / DURATION, 1)
    const progress = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t  // ease-in-out
    const revealed = -Math.PI / 2 + progress * Math.PI * 2         // clockwise end angle

    ctx.clearRect(0, 0, SIZE, SIZE)

    segs.forEach(seg => {
      const segEnd = seg.start + seg.sweep
      if (revealed <= seg.start) return  // not yet reached

      const drawEnd = Math.min(segEnd, revealed)

      // two-pass neon glow
      for (let pass = 0; pass < 2; pass++) {
        ctx.save()
        ctx.shadowColor = seg.color
        if (pass === 0) {
          ctx.shadowBlur  = 18
          ctx.globalAlpha = 0.55
        } else {
          ctx.shadowBlur  = 7
          ctx.globalAlpha = 1
        }
        ctx.fillStyle = seg.color
        ctx.beginPath()
        ctx.arc(cx, cy, outerR, seg.start, drawEnd)
        ctx.arc(cx, cy, innerR, drawEnd, seg.start, true)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
    })

    // dark center (always on top)
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
