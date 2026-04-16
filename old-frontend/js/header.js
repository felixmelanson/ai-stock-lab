// logo scrolls to top
const logoBtn = document.getElementById('logo-btn')
logoBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

// tab glow — radial blob follows the active tab across the pill
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn')
  const glow = document.querySelector('.tab-glow')
  const pill = document.querySelector('.header-pill')

  function snapGlow(btn) {
    const pillRect = pill.getBoundingClientRect()
    const btnRect  = btn.getBoundingClientRect()
    const spread   = 40
    glow.style.left  = (btnRect.left - pillRect.left - spread) + 'px'
    glow.style.width = (btnRect.width + spread * 2) + 'px'
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      snapGlow(tab)
    })
  })

  requestAnimationFrame(() => {
    const active = document.querySelector('.tab-btn.active')
    if (active) snapGlow(active)
  })
}

document.addEventListener('DOMContentLoaded', initTabs)
