// ── model definitions ──────────────────────────────────────────────────────
const CHART_MODELS = [
  { key: 'claude',   label: 'Claude 3.5', logo: 'assets/company-logos/claude.svg',    neon: 'hsl(22,100%,58%)',   final: 111583, seed: 1, facet: 'lava'      },
  { key: 'gpt4o',    label: 'GPT-4O',     logo: 'assets/company-logos/chatgpt.webp',  neon: 'hsl(174,100%,55%)',  final: 107842, seed: 2, facet: 'aquamarine' },
  { key: 'gemini',   label: 'Gemini 2.0', logo: 'assets/company-logos/gemini.png',    neon: 'hsl(142,100%,62%)',  final: 104219, seed: 3, facet: 'jade'       },
  { key: 'grok',     label: 'Grok 4.1',   logo: 'assets/company-logos/grokwhite.png', neon: 'hsl(220,12%,70%)',   final: 101653, seed: 4, facet: 'slate'      },
  { key: 'deepseek', label: 'DeepSeek R1',   logo: 'assets/company-logos/deepseek.png',  neon: 'hsl(210,100%,72%)',  final:  97408, seed: 5, facet: 'moonstone'  },
  { key: 'llama',    label: 'Llama 3.1',  logo: 'assets/company-logos/meta.png',      neon: 'hsl(215,85%,48%)',   final:  93174, seed: 6, facet: 'sapphire'   },
  { key: 'qwen',     label: 'Qwen 2.5',   logo: 'assets/company-logos/qwen.webp',     neon: 'hsl(268,75%,50%)',   final:  87291, seed: 7, facet: 'iolite'     },
]
const SP500    = { key: 'sp500', label: 'S&P 500', color: 'rgba(200,30,35,0.9)', glowColor: 'rgba(190,18,60,0.8)', facet: 'garnet', final: 102580, seed: 8 }
const N_POINTS = 60
const MARGIN   = { top: 58, right: 58, bottom: 46, left: 82 }
const ANIM_DUR = 1200
const STAGGER  = 80

// ── seeded random ──────────────────────────────────────────────────────────
function lcgRand(seed) {
  let s = (seed * 9301 + 49297) % 233280
  return function () {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// ── data generation ────────────────────────────────────────────────────────
function generateData(finalValue, seed) {
  const rand = lcgRand(seed)
  const n = N_POINTS
  const start = 100000
  const raw = new Array(n)
  raw[0] = start
  for (let i = 1; i < n; i++) {
    const t = i / (n - 1)
    const trend = start + (finalValue - start) * t
    const vol = 2800 * (1 - t * 0.45)
    raw[i] = trend + (rand() - 0.5) * 2 * vol
  }
  raw[n - 1] = finalValue
  const data = raw.slice()
  for (let i = 1; i < n - 1; i++) {
    data[i] = Math.round((raw[i - 1] + raw[i] * 2 + raw[i + 1]) / 4)
  }
  data[0] = start
  data[n - 1] = finalValue
  return data
}

// ── trading dates ──────────────────────────────────────────────────────────
function tradingDates(startISO, count) {
  const dates = []
  const d = new Date(startISO + 'T12:00:00Z')
  while (dates.length < count) {
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) dates.push(new Date(d))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return dates
}
function fmtDate(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}
function fmtDollar(n) {
  return '$' + Math.round(n).toLocaleString('en-US')
}

// ── arc-length helpers ──────────────────────────────────────────────────────
function arcLengths(pts) {
  const lens = [0]
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    lens.push(lens[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  return lens
}

function drawAtProgress(ctx, pts, lens, totalLen, progress) {
  const target = progress * totalLen
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) {
    if (lens[i] >= target) {
      const seg = lens[i] - lens[i - 1]
      const t   = seg > 0 ? (target - lens[i - 1]) / seg : 0
      ctx.lineTo(pts[i - 1].x + t * (pts[i].x - pts[i - 1].x),
                 pts[i - 1].y + t * (pts[i].y - pts[i - 1].y))
      break
    }
    ctx.lineTo(pts[i].x, pts[i].y)
  }
  ctx.stroke()
}

// ── main entry point ────────────────────────────────────────────────────────
function buildChart() {
  const panel  = document.getElementById('graph-panel')
  const canvas = document.getElementById('portfolio-chart')
  const dpr    = window.devicePixelRatio || 1
  const W      = panel.clientWidth
  const H      = panel.clientHeight

  canvas.width  = W * dpr
  canvas.height = H * dpr
  canvas.style.width  = W + 'px'
  canvas.style.height = H + 'px'

  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const cW = W - MARGIN.left - MARGIN.right
  const cH = H - MARGIN.top  - MARGIN.bottom

  const dates     = tradingDates('2026-01-06', N_POINTS)
  const allSeries = CHART_MODELS.map(m => ({ ...m, data: generateData(m.final, m.seed) }))
  const spSeries  = { ...SP500, data: generateData(SP500.final, SP500.seed) }

  // natural y range
  let yMin = Infinity, yMax = -Infinity
  ;[...allSeries, spSeries].forEach(s => {
    s.data.forEach(v => { if (v < yMin) yMin = v; if (v > yMax) yMax = v })
  })
  const yPad = (yMax - yMin) * 0.08
  yMin -= yPad; yMax += yPad
  const naturalYRange = yMax - yMin

  // ── VIEW STATE ────────────────────────────────────────────────────────────
  let xStart   = 0,    xEnd   = N_POINTS - 1
  let yMinView = yMin, yMaxView = yMax

  function xOf(i) { return MARGIN.left + ((i - xStart) / (xEnd - xStart)) * cW }
  function yOf(v) { return MARGIN.top  + (1 - (v - yMinView) / (yMaxView - yMinView)) * cH }

  function buildViewLine(s) {
    const pts  = s.data.map((v, i) => ({ x: xOf(i), y: yOf(v) }))
    const lens = arcLengths(pts)
    return { ...s, pts, lens, totalLen: lens[lens.length - 1] }
  }

  const lines  = allSeries.map(s => buildViewLine(s))
  const spLine = buildViewLine(spSeries)

  // ── tick helpers ──────────────────────────────────────────────────────────
  function xTicks() {
    const xSI = Math.max(0, Math.ceil(xStart - 0.001))
    const xEI = Math.min(N_POINTS - 1, Math.floor(xEnd + 0.001))
    const vis  = xEI - xSI + 1
    const idealStep = Math.max(1, Math.round(vis / 6))
    const niceSteps = [1, 2, 5, 10, 15, 20, 30]
    const step  = niceSteps.find(s => s >= idealStep) || idealStep
    const first = Math.ceil(xSI / step) * step
    const ticks = []
    for (let i = first; i <= xEI; i += step) ticks.push(i)
    return ticks
  }

  // ── draw grid ─────────────────────────────────────────────────────────────
  function drawGrid() {
    ctx.strokeStyle = 'rgba(255,255,255,0.055)'
    ctx.lineWidth   = 1
    ctx.setLineDash([])
    for (let k = 0; k <= 5; k++) {
      const y = MARGIN.top + (k / 5) * cH
      ctx.beginPath(); ctx.moveTo(MARGIN.left, y); ctx.lineTo(W - MARGIN.right, y); ctx.stroke()
    }
    xTicks().forEach(i => {
      const x = xOf(i)
      ctx.beginPath(); ctx.moveTo(x, MARGIN.top); ctx.lineTo(x, MARGIN.top + cH); ctx.stroke()
    })
  }

  // ── draw axes ─────────────────────────────────────────────────────────────
  function drawAxes() {
    ctx.fillStyle    = 'rgba(255,255,255,0.26)'
    ctx.font         = '500 10px "Space Grotesk", system-ui, sans-serif'
    ctx.shadowBlur   = 0
    ctx.setLineDash([])
    ctx.textAlign    = 'right'
    ctx.textBaseline = 'middle'
    for (let k = 0; k <= 5; k++) {
      const v = yMinView + (1 - k / 5) * (yMaxView - yMinView)
      ctx.fillText(fmtDollar(v), MARGIN.left - 8, MARGIN.top + (k / 5) * cH)
    }
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'top'
    xTicks().forEach(i => ctx.fillText(fmtDate(dates[i]), xOf(i), MARGIN.top + cH + 10))
  }

  // ── core draw (no endpoint rebuild) ──────────────────────────────────────
  let liveLines = lines, liveSpLine = spLine

  function drawLines() {
    liveLines  = allSeries.map(s => buildViewLine(s))
    liveSpLine = buildViewLine(spSeries)

    ctx.clearRect(0, 0, W, H)
    drawGrid()
    drawAxes()

    ctx.save()
    ctx.beginPath()
    ctx.rect(MARGIN.left, MARGIN.top, cW, cH)
    ctx.clip()

    // S&P — solid ruby red with glow
    ctx.strokeStyle = SP500.color
    ctx.lineWidth   = 1.5
    ctx.setLineDash([])
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.shadowColor = SP500.glowColor
    ctx.shadowBlur  = 10
    ctx.globalAlpha = 0.65
    ctx.beginPath()
    liveSpLine.pts.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
    ctx.stroke()
    ctx.shadowBlur  = 5
    ctx.globalAlpha = 1
    ctx.beginPath()
    liveSpLine.pts.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
    ctx.stroke()
    ctx.shadowBlur  = 0
    ctx.globalAlpha = 1

    // model lines — neon glow (outer + sharp pass)
    liveLines.forEach(line => {
      ctx.strokeStyle = line.neon
      ctx.lineWidth   = 2
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
      ctx.shadowColor = line.neon
      ctx.shadowBlur  = 14
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      line.pts.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
      ctx.stroke()
      ctx.shadowBlur  = 6
      ctx.globalAlpha = 1
      ctx.beginPath()
      line.pts.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
      ctx.stroke()
      ctx.shadowBlur  = 0
      ctx.globalAlpha = 1
    })

    ctx.restore()
  }

  // check if endpoint X is currently in frame, then rebuild circles
  function buildEndpoints() {
    const finalX = xOf(N_POINTS - 1)
    const inFrame = finalX >= MARGIN.left && finalX <= W - MARGIN.right
    buildEndpointCircles(liveLines, liveSpLine, xOf, yOf, inFrame)
  }

  function renderStatic() {
    drawLines()
    buildEndpoints()
  }

  // ── animation loop ─────────────────────────────────────────────────────────
  let animStart   = null
  const totalAnim = ANIM_DUR + lines.length * STAGGER
  let animDone    = false

  function frame(ts) {
    if (!animStart) animStart = ts
    const elapsed = ts - animStart

    ctx.clearRect(0, 0, W, H)
    drawGrid()
    drawAxes()

    ctx.save()
    ctx.beginPath()
    ctx.rect(MARGIN.left, MARGIN.top, cW, cH)
    ctx.clip()

    // S&P animation — solid ruby red with glow 
    // TODO: make it look more like other lines lol
    const spProgress = Math.min(1, Math.max(0, elapsed) / ANIM_DUR)
    ctx.strokeStyle = SP500.color
    ctx.lineWidth   = 1.5
    ctx.setLineDash([])
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.shadowColor = SP500.glowColor
    ctx.shadowBlur  = 10
    ctx.globalAlpha = 0.65
    drawAtProgress(ctx, spLine.pts, spLine.lens, spLine.totalLen, spProgress)
    ctx.shadowBlur  = 5
    ctx.globalAlpha = 1
    drawAtProgress(ctx, spLine.pts, spLine.lens, spLine.totalLen, spProgress)
    ctx.shadowBlur  = 0
    ctx.globalAlpha = 1

    lines.forEach((line, i) => {
      const lineElapsed  = Math.max(0, elapsed - (i + 1) * STAGGER)
      const lineProgress = Math.min(1, lineElapsed / ANIM_DUR)
      ctx.strokeStyle  = line.neon
      ctx.lineWidth    = 2
      ctx.lineCap      = 'round'
      ctx.lineJoin     = 'round'
      ctx.shadowColor  = line.neon
      ctx.shadowBlur   = 14
      ctx.globalAlpha  = 0.5
      drawAtProgress(ctx, line.pts, line.lens, line.totalLen, lineProgress)
      ctx.shadowBlur   = 6
      ctx.globalAlpha  = 1
      drawAtProgress(ctx, line.pts, line.lens, line.totalLen, lineProgress)
      ctx.shadowBlur   = 0
      ctx.globalAlpha  = 1
    })

    ctx.restore()

    if (elapsed < totalAnim) {
      requestAnimationFrame(frame)
    } else if (!animDone) {
      animDone = true
      renderStatic()
      setupCrosshair()
      setupZoom()
      setupPan()
    }
  }

  // ── crosshair + tooltip ───────────────────────────────────────────────────
  function setupCrosshair() {
    const vline      = document.getElementById('chart-guideline')
    const hline      = document.getElementById('chart-hguideline')
    const crosshair  = document.getElementById('chart-crosshair')
    const tooltip    = document.getElementById('chart-tooltip')

    function show(e) {
      if (dragging) return
      const rect = canvas.getBoundingClientRect()
      const mx   = e.clientX - rect.left
      const my   = e.clientY - rect.top
      if (mx < MARGIN.left || mx > W - MARGIN.right || my < MARGIN.top || my > H - MARGIN.bottom) {
        hide(); return
      }
      const rawIdx = xStart + (mx - MARGIN.left) / cW * (xEnd - xStart)
      const idx    = Math.max(0, Math.min(N_POINTS - 1, Math.round(rawIdx)))
      const snapX  = xOf(idx)

      vline.style.left    = snapX + 'px'
      vline.style.display = 'block'
      hline.style.top     = my + 'px'
      hline.style.display = 'block'
      crosshair.style.left    = snapX + 'px'
      crosshair.style.top     = my + 'px'
      crosshair.style.display = 'block'

      let html = `<div class="tooltip-date">${fmtDate(dates[idx])}</div>`
      liveLines.forEach(line => {
        html += `<div class="tooltip-row">
          <span class="tooltip-dot" style="background:${line.neon}"></span>
          <span class="tooltip-name">${line.label}</span>
          <span class="tooltip-val">${fmtDollar(line.data[idx])}</span>
        </div>`
      })
      html += `<div class="tooltip-row">
        <span class="tooltip-dot" style="background:${SP500.color}"></span>
        <span class="tooltip-name">${SP500.label}</span>
        <span class="tooltip-val">${fmtDollar(spSeries.data[idx])}</span>
      </div>`
      tooltip.innerHTML = html

      const panelW = panel.getBoundingClientRect().width
      const tipW   = 200
      let tipLeft  = snapX + 14
      if (tipLeft + tipW > panelW - 10) tipLeft = snapX - tipW - 14
      tooltip.style.left = tipLeft + 'px'

      const tipH   = tooltip.offsetHeight || 190
      const minTop = MARGIN.top
      const maxTop = H - MARGIN.bottom - tipH - 4
      tooltip.style.top     = Math.max(minTop, Math.min(maxTop, my - tipH / 2)) + 'px'
      tooltip.style.display = 'block'
    }

    function hide() {
      vline.style.display     = 'none'
      hline.style.display     = 'none'
      crosshair.style.display = 'none'
      tooltip.style.display   = 'none'
    }

    canvas.addEventListener('mousemove', show)
    canvas.addEventListener('mouseleave', hide)
  }

  // ── scroll zoom ───────────────────────────────────────────────────────────
  function setupZoom() {
    panel.addEventListener('wheel', (e) => {
      e.preventDefault()
      if (dragging) return

      const rect = canvas.getBoundingClientRect()
      const mx   = e.clientX - rect.left
      const my   = e.clientY - rect.top
      if (mx < MARGIN.left || mx > W - MARGIN.right || my < MARGIN.top || my > H - MARGIN.bottom) return

      // scroll DOWN = zoom IN (compress view = smaller range)
      // scroll UP   = zoom OUT (expand view = larger range)
      const zoomIn = e.deltaY > 0
      const factor = zoomIn ? 0.88 : 1.12

      // Y zoom — keep value under cursor fixed
      const fracY     = (my - MARGIN.top) / cH
      const cursorVal = yMaxView - fracY * (yMaxView - yMinView)
      const newYRange = Math.max(naturalYRange * 0.06, Math.min(naturalYRange * 4, (yMaxView - yMinView) * factor))
      yMaxView = cursorVal + fracY * newYRange
      yMinView = cursorVal - (1 - fracY) * newYRange

      // X zoom — keep index under cursor fixed
      const fracX     = (mx - MARGIN.left) / cW
      const cursorIdx = xStart + fracX * (xEnd - xStart)
      const newXRange = Math.max(4, Math.min(N_POINTS - 1, (xEnd - xStart) * factor))
      xStart = Math.max(0, cursorIdx - fracX * newXRange)
      xEnd   = Math.min(N_POINTS - 1, xStart + newXRange)

      renderStatic()
    }, { passive: false })
  }

  // ── click+drag pan ────────────────────────────────────────────────────────
  let dragging = false

  function setupPan() {
    let startX, startY
    let snapXStart, snapXEnd, snapYMin, snapYMax
    const epContainer = document.getElementById('endpoint-circles')

    panel.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || !animDone) return
      dragging = true
      startX = e.clientX; startY = e.clientY
      snapXStart = xStart; snapXEnd = xEnd
      snapYMin   = yMinView; snapYMax = yMaxView
      epContainer.innerHTML = ''  // hide circles while panning
      panel.style.cursor = 'grab'
      e.preventDefault()
    })

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return
      panel.style.cursor = 'grabbing'
      const dx = e.clientX - startX
      const dy = e.clientY - startY

      // X pan: drag right → shift view left (earlier dates)
      const xRange  = snapXEnd - snapXStart
      const xShift  = -(dx / cW) * xRange
      let nx0 = snapXStart + xShift
      let nx1 = snapXEnd   + xShift
      if (nx0 < 0)            { nx1 -= nx0; nx0 = 0 }
      if (nx1 > N_POINTS - 1) { nx0 -= (nx1 - (N_POINTS - 1)); nx1 = N_POINTS - 1 }
      xStart = Math.max(0, nx0)
      xEnd   = Math.min(N_POINTS - 1, nx1)

      // Y pan: drag down → shift view down (lower values on screen)
      const yRange = snapYMax - snapYMin
      const yShift = (dy / cH) * yRange
      yMinView = snapYMin + yShift
      yMaxView = snapYMax + yShift

      drawLines()  // fast redraw without endpoint rebuild
    })

    window.addEventListener('mouseup', () => {
      if (!dragging) return
      dragging = false
      panel.style.cursor = ''
      buildEndpoints()  // sequential reveal once movement stops
    })
  }

  requestAnimationFrame(frame)
}

// ── endpoint circles ──────────────────────────────────────────────────────────
function buildEndpointCircles(lines, spLine, xOfFn, yOfFn, inFrame) {
  const container = document.getElementById('endpoint-circles')
  container.innerHTML = ''
  if (!inFrame) return

  const finalX = xOfFn(N_POINTS - 1)

  // model line endpoints
  lines.forEach((line, idx) => {
    const f      = FACETS[line.facet]
    const finalY = yOfFn(line.final)

    const wrap = document.createElement('div')
    wrap.className = 'endpoint-wrap'
    wrap.style.left = finalX + 'px'
    wrap.style.top  = finalY + 'px'
    wrap.style.animationDelay = (idx * 0.06) + 's'

    const pulse1 = document.createElement('div')
    pulse1.className = 'endpoint-pulse'
    pulse1.style.borderColor = line.neon

    const pulse2 = document.createElement('div')
    pulse2.className = 'endpoint-pulse endpoint-pulse-2'
    pulse2.style.borderColor = line.neon

    const circle = document.createElement('div')
    circle.className = 'endpoint-circle'
    circle.style.cssText = `
      background: linear-gradient(135deg, ${f.mid} 0%, ${f.base} 100%);
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 3px 10px -2px ${f.facet},
                  inset 1.5px 2px 0.5px -0.5px rgba(255,255,255,0.85),
                  inset -1.5px -2px 0.5px -0.5px rgba(0,0,0,0.4),
                  inset 3px 3px 6px -2px rgba(255,255,255,0.25),
                  inset -2px -2px 8px rgba(0,0,0,0.5),
                  inset 0 0 0 1px rgba(255,255,255,0.12);
    `

    const glowTL = document.createElement('div')
    glowTL.className = 'endpoint-circle-glow'
    glowTL.style.cssText = `top:-3px;left:-3px;width:14px;height:14px;background:radial-gradient(circle,white 0%,${f.facet} 30%,transparent 70%);`

    const glowBR = document.createElement('div')
    glowBR.className = 'endpoint-circle-glow'
    glowBR.style.cssText = `bottom:-3px;right:-3px;width:14px;height:14px;background:radial-gradient(circle,white 0%,${f.facet} 30%,transparent 70%);`

    const img = document.createElement('img')
    img.src = line.logo
    img.alt = line.label

    circle.appendChild(glowTL)
    circle.appendChild(glowBR)
    circle.appendChild(img)
    wrap.appendChild(pulse1)
    wrap.appendChild(pulse2)
    wrap.appendChild(circle)
    container.appendChild(wrap)
  })

  // S&P endpoint — garnet gem style
  const gf     = FACETS['garnet']
  const spY    = yOfFn(spLine.final)
  const spWrap = document.createElement('div')
  spWrap.className = 'endpoint-wrap'
  spWrap.style.left = finalX + 'px'
  spWrap.style.top  = spY + 'px'
  spWrap.style.animationDelay = (lines.length * 0.06) + 's'

  const spPulse1 = document.createElement('div')
  spPulse1.className = 'endpoint-pulse'
  spPulse1.style.borderColor = SP500.color

  const spPulse2 = document.createElement('div')
  spPulse2.className = 'endpoint-pulse endpoint-pulse-2'
  spPulse2.style.borderColor = SP500.color

  const spCircle = document.createElement('div')
  spCircle.className = 'endpoint-circle'
  spCircle.style.cssText = `
    background: linear-gradient(135deg, ${gf.mid} 0%, ${gf.base} 100%);
    border: 1px solid rgba(255,255,255,0.12);
    box-shadow: 0 3px 10px -2px ${gf.facet},
                inset 1.5px 2px 0.5px -0.5px rgba(255,255,255,0.85),
                inset -1.5px -2px 0.5px -0.5px rgba(0,0,0,0.4),
                inset 3px 3px 6px -2px rgba(255,255,255,0.25),
                inset -2px -2px 8px rgba(0,0,0,0.5),
                inset 0 0 0 1px rgba(255,255,255,0.12);
  `

  const spGlowTL = document.createElement('div')
  spGlowTL.className = 'endpoint-circle-glow'
  spGlowTL.style.cssText = `top:-3px;left:-3px;width:14px;height:14px;background:radial-gradient(circle,white 0%,${gf.facet} 30%,transparent 70%);`

  const spGlowBR = document.createElement('div')
  spGlowBR.className = 'endpoint-circle-glow'
  spGlowBR.style.cssText = `bottom:-3px;right:-3px;width:14px;height:14px;background:radial-gradient(circle,white 0%,${gf.facet} 30%,transparent 70%);`

  const spLabel = document.createElement('span')
  spLabel.className = 'endpoint-circle-sp'
  spLabel.textContent = 'SP'

  spCircle.appendChild(spGlowTL)
  spCircle.appendChild(spGlowBR)
  spCircle.appendChild(spLabel)
  spWrap.appendChild(spPulse1)
  spWrap.appendChild(spPulse2)
  spWrap.appendChild(spCircle)
  container.appendChild(spWrap)
}
