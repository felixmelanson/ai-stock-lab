// gem colors — full palette, tweak freely
// glow is for the outer drop-shadow, kept at consistent perceived brightness across themes
const FACETS = {

  // base set
  ruby:       { base: '#1a0000', mid: '#4a0000', facet: 'rgba(255,30,30,0.6)',      light: 'rgba(255,30,30,0.5)',      glow: 'rgba(255,30,30,0.75)'       },
  emerald:    { base: '#001a08', mid: '#003d14', facet: 'rgba(34,197,94,0.6)',      light: 'rgba(34,197,94,0.5)',      glow: 'rgba(34,197,94,0.75)'       },
  sapphire:   { base: '#000b20', mid: '#002060', facet: 'rgba(59,130,246,0.6)',     light: 'rgba(59,130,246,0.5)',     glow: 'rgba(59,130,246,0.75)'      },
  amethyst:   { base: '#1a001a', mid: '#3d003d', facet: 'rgba(217,70,239,0.6)',     light: 'rgba(217,70,239,0.5)',     glow: 'rgba(217,70,239,0.75)'      },
  amber:      { base: '#1a0d00', mid: '#3d2000', facet: 'rgba(245,158,11,0.6)',     light: 'rgba(245,158,11,0.5)',     glow: 'rgba(245,158,11,0.75)'      },
  iolite:     { base: '#2b1253', mid: '#1a0a3d', facet: 'rgba(139,92,246,0.6)',     light: 'rgba(139,92,246,0.5)',     glow: 'rgba(139,92,246,0.75)'      },
  ice:        { base: '#00151a', mid: '#002b35', facet: 'rgba(6,182,212,0.6)',      light: 'rgba(6,182,212,0.5)',      glow: 'rgba(6,182,212,0.75)'       },
  lava:       { base: '#1a0800', mid: '#3d1400', facet: 'rgba(249,115,22,0.6)',     light: 'rgba(249,115,22,0.5)',     glow: 'rgba(249,115,22,0.75)'      },
  citrine:    { base: '#1a1400', mid: '#3d2e00', facet: 'rgba(234,179,8,0.6)',      light: 'rgba(234,179,8,0.5)',      glow: 'rgba(234,179,8,0.75)'       },
  coral:      { base: '#1a0508', mid: '#3d0f14', facet: 'rgba(251,113,133,0.6)',    light: 'rgba(251,113,133,0.5)',    glow: 'rgba(251,113,133,0.75)'     },
  topaz:      { base: '#1a0f00', mid: '#3d2300', facet: 'rgba(251,146,60,0.6)',     light: 'rgba(251,146,60,0.5)',     glow: 'rgba(251,146,60,0.75)'      },
  tanzanite:  { base: '#0a001a', mid: '#1e003d', facet: 'rgba(124,58,237,0.6)',     light: 'rgba(124,58,237,0.5)',     glow: 'rgba(124,58,237,0.75)'      },
  moonstone:  { base: '#1c1c39', mid: '#242451', facet: 'rgba(152,189,234,0.5)',    light: 'rgba(226,232,240,0.4)',    glow: 'rgba(152,189,234,0.8)'      },

  // extended
  peridot:    { base: '#0d1a00', mid: '#1e2b00', facet: 'rgba(163,230,53,0.6)',     light: 'rgba(163,230,53,0.5)',     glow: 'rgba(163,230,53,0.75)'      },
  diamond:    { base: '#1a1a1a', mid: '#333333', facet: 'rgba(255,255,255,0.3)',    light: 'rgba(255,255,255,0.4)',    glow: 'rgba(255,255,255,0.55)'     },
  slate:      { base: '#0c0c10', mid: '#1c1c24', facet: 'rgba(148,163,184,0.35)',   light: 'rgba(148,163,184,0.3)',    glow: 'rgba(148,163,184,0.7)'      },
  nacre:      { base: '#1a141a', mid: '#3d2d3d', facet: 'rgba(210,210,255,0.4)',    light: 'rgba(245,245,255,0.4)',    glow: 'rgba(210,210,255,0.75)'     },
  abyss:      { base: '#00051a', mid: '#000a3d', facet: 'rgba(30,64,175,0.6)',      light: 'rgba(30,64,175,0.5)',      glow: 'rgba(30,64,175,0.9)'        },
  morganite:  { base: '#1a000d', mid: '#4a0028', facet: 'rgba(255,105,180,0.6)',    light: 'rgba(255,105,180,0.5)',    glow: 'rgba(255,105,180,0.75)'     },
  olive:      { base: '#0d0d00', mid: '#242600', facet: 'rgba(128,128,0,0.6)',      light: 'rgba(128,128,0,0.5)',      glow: 'rgba(128,128,0,0.8)'        },
  turquoise:  { base: '#001a1a', mid: '#004d4d', facet: 'rgba(20,184,166,0.6)',     light: 'rgba(20,184,166,0.5)',     glow: 'rgba(20,184,166,0.75)'      },
  onyx:       { base: '#000000', mid: '#0a0a14', facet: 'rgba(100,116,139,0.5)',    light: 'rgba(100,116,139,0.4)',    glow: 'rgba(100,116,139,0.75)'     },
  garnet:     { base: '#1a0005', mid: '#4a0010', facet: 'rgba(190,18,60,0.6)',      light: 'rgba(190,18,60,0.5)',      glow: 'rgba(190,18,60,0.75)'       },
  jade:       { base: '#001a0a', mid: '#003d1e', facet: 'rgba(74,222,128,0.6)',     light: 'rgba(74,222,128,0.5)',     glow: 'rgba(74,222,128,0.75)'      },
  aquamarine: { base: '#001a16', mid: '#003d35', facet: 'rgba(20,184,166,0.6)',     light: 'rgba(20,184,166,0.5)',     glow: 'rgba(20,184,166,0.75)'      },
  obsidian:   { base: '#05000a', mid: '#0f001a', facet: 'rgba(88,28,135,0.6)',      light: 'rgba(88,28,135,0.5)',      glow: 'rgba(88,28,135,0.85)'       },
  carnelian:  { base: '#1a0300', mid: '#3d0a00', facet: 'rgba(234,88,12,0.6)',      light: 'rgba(234,88,12,0.5)',      glow: 'rgba(234,88,12,0.75)'       },
}

function applyFacet(el, name) {
  const f = FACETS[name]
  if (!f) return
  el.style.setProperty('--g-base',  f.base)
  el.style.setProperty('--g-mid',   f.mid)
  el.style.setProperty('--g-facet', f.facet)
  el.style.setProperty('--g-light', f.light)
}
