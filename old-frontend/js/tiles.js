const STARTING_AMOUNT = 100000

let selectedTileIdx = null

function setGraphTitle(text) {
  const el = document.getElementById('graph-title')
  if (el) el.textContent = text
}

function selectTile(idx) {
  selectedTileIdx = idx
  document.querySelectorAll('.tile-wrap').forEach((el, i) => {
    el.classList.toggle('dimmed', i !== idx)
    el.classList.toggle('selected', i === idx)
  })
  setGraphTitle('TOTAL ACCOUNT VALUE (' + TILES[idx].model + ')')
  if (typeof window.focusChartLine === 'function') window.focusChartLine(idx)
  if (typeof showPortfolio === 'function') showPortfolio(TILES[idx])
}

function deselectTile() {
  selectedTileIdx = null
  document.querySelectorAll('.tile-wrap').forEach(el => {
    el.classList.remove('dimmed', 'selected')
  })
  setGraphTitle('TOTAL ACCOUNT VALUE (ALL MODELS)')
  if (typeof window.unfocusChartLine === 'function') window.unfocusChartLine()
  if (typeof showActivity === 'function') showActivity()
}

// ── tile font ─────────────────────────────────────────────────────────────
const TILE_FONT = "'Space Grotesk', sans-serif"

// ── rank helpers ──────────────────────────────────────────────────────────
function ordinal(n) {
  if (n === 1) return '1ST'
  if (n === 2) return '2ND'
  if (n === 3) return '3RD'
  return n + 'TH'
}

function rankStyle(i) {
  const base = `display:inline-block;font-size:clamp(9px,1.1vw,11px);font-weight:700;text-transform:uppercase;letter-spacing:0.1em;line-height:1.4;font-family:inherit`
  if (i === 0) return `${base};background:linear-gradient(135deg,#FFD700 0%,#FFC800 40%,#FFE066 60%,#FFD700 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text`
  if (i === 1) return `${base};background:linear-gradient(135deg,#A8A8A8 0%,#E0E0E0 45%,#C0C0C0 65%,#A8A8A8 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text`
  if (i === 2) return `${base};background:linear-gradient(135deg,#B06020 0%,#E09050 45%,#C87840 65%,#B06020 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text`
  return `${base};color:rgba(255,255,255,0.32)`
}

function buildGrid() {
  const grid = document.getElementById('tile-grid')

  TILES.forEach((tile, i) => {
    const f = FACETS[tile.facet]

    const rawValue = parseFloat(tile.portfolio.replace(/[$,]/g, ''))
    const delta = rawValue - STARTING_AMOUNT
    const pct = (delta / STARTING_AMOUNT * 100).toFixed(1)
    const deltaAbbrev = (delta >= 0 ? '+' : '') + pct + '%'
    const triangleSymbol = delta >= 0 ? '▲' : '▼'
    const deltaColor = 'rgba(255,255,255,0.32)'
    const modelTextStyle = `display:block;font-size:clamp(11px,1.3vw,13px);font-weight:700;text-transform:none;letter-spacing:0.1em;color:rgba(255,255,255,0.65);line-height:1.4;font-family:${TILE_FONT}`
    const metricsTextStyle = `font-size:clamp(9px,1vw,11px);font-weight:700;letter-spacing:0.06em;color:rgba(255,255,255,0.32);font-variant-numeric:tabular-nums`
    const metricsDeltaStyle = `font-size:clamp(9px,1vw,11px);font-weight:700;color:${deltaColor};letter-spacing:0.03em`

    const wrap = document.createElement('div')
    wrap.className = 'tile-wrap'
    wrap.style.cssText = `
      position: relative;
      aspect-ratio: 1 / 1;
    `

    const inner = document.createElement('div')
    inner.className = 'tile-inner'
    inner.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 24px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem;
      background: linear-gradient(180deg, ${f.mid} 0%, ${f.base} 100%);
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.8);
      filter: drop-shadow(0 0 6px ${f.glow}) blur(0.3px);
    `

    inner.innerHTML = `
      <div style="position:absolute;inset:0;border-radius:24px;overflow:hidden;pointer-events:none;z-index:0">
        <div style="position:absolute;inset:-150%;opacity:0.6;mix-blend-mode:screen;transform-origin:50% 50%;animation:sweep-arc 12s linear infinite;animation-delay:${i * 1.2}s">
          <div style="width:100%;height:100%;filter:blur(25px);background:conic-gradient(from 0deg,transparent 0%,${f.light} 4%,#fff 5%,${f.light} 6%,transparent 15%,transparent 100%)"></div>
        </div>
      </div>

      <div style="position:absolute;top:7.5px;left:50%;transform:translateX(-50%);width:90%;height:55%;border-radius:20px 20px 0 0;pointer-events:none;opacity:0.4;mix-blend-mode:plus-lighter;background:linear-gradient(to bottom,rgba(255,255,255,0.4),transparent);z-index:2"></div>
      <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);width:90%;height:45%;border-radius:0 0 20px 20px;pointer-events:none;opacity:0.3;mix-blend-mode:plus-lighter;background:linear-gradient(to top,rgba(255,255,255,0.45),transparent);z-index:2"></div>

      <div style="position:relative;z-index:20;padding:10px;border-radius:14px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:inset 0 0 14px ${f.facet};overflow:hidden">
        <img src="${tile.logo}" alt="${tile.model}" style="width:2.4rem;height:2.4rem;object-fit:contain;display:block;position:relative;z-index:2" />
      </div>

      <div style="position:relative;z-index:20;text-align:center;width:100%;padding-bottom:.4rem;margin-top:1rem">
        <span style="${modelTextStyle}"><span style="color:rgba(255,255,255,0.65)">#${i + 1}</span> ${tile.model}</span>
      </div>

      <div style="position:relative;z-index:20;width:100%;padding:0.25rem 0;display:flex;flex-direction:column;align-items:center;gap:0.25rem">
        <div style="display:flex;align-items:center;justify-content:center;gap:0.25rem">
          <span style="${metricsTextStyle}">${tile.portfolio}</span>
          <span style="${metricsDeltaStyle}">${triangleSymbol} ${deltaAbbrev}</span>
        </div>
      </div>
    `

    wrap.appendChild(inner)
    wrap.addEventListener('click', () => {
      if (selectedTileIdx === i) {
        deselectTile()
      } else {
        selectTile(i)
      }
    })
    grid.appendChild(wrap)
  })
}

buildGrid()
