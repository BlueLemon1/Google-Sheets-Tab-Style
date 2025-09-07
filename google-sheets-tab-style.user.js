// ==UserScript==
// @name         Google Sheets Tab Style
// @namespace    http://tampermonkey.net/
// @version      5.0
// @description  Google Spreadsheet Styler
// @match        https://docs.google.com/spreadsheets/*
// @grant        none
// @author       Bluelemon1
// @updateURL    https://raw.githubusercontent.com/BlueLemon1/Google-Sheets-Tab-Style/main/google-sheets-tab-style.user.js
// @downloadURL  https://raw.githubusercontent.com/BlueLemon1/Google-Sheets-Tab-Style/main/google-sheets-tab-style.user.js
// ==/UserScript==
(() => {
  'use strict';

  /*** CONFIGURATION ***/
  const CONFIG = {
    inactiveHeight: 0.85,
    inactiveOpacity: 0.8,
    inactiveTextOpacity: 1,
    activeGlow: true,
    activeGlowStrength: 0.8,
    activeScale: 1.1,
    hoverGlowStrength: 0.2,
    hoverScale: 1.02,
    borderRadius: '4px 4px 0 0',
    transitionSpeed: 250,
    minLuminanceForDarkText: 130,
    uncoloredTabsMode: "style", // "skip", "style", "cssOnly"
    uncoloredColor: 'rgba(220,220,220,1)'
  };

  const STYLE_CLASS = 'gst-styled';
  const CSS_ONLY_CLASS = 'gst-cssonly';
  const LIGHT_TEXT_CLASS = 'gst-light-text';
  const DARK_TEXT_CLASS = 'gst-dark-text';

  /*** ADD STYLESHEET ***/
  const style = document.createElement('style');
  style.textContent = `
    .${STYLE_CLASS}, .${CSS_ONLY_CLASS} {
      position: relative !important;
      background: transparent !important;
      overflow: visible;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform ${CONFIG.transitionSpeed}ms ease;
    }
    .${STYLE_CLASS} .tab-color-fill {
      position: absolute;
      left: 0; right: 0; bottom: 0;
      z-index: 0;
      pointer-events: none;
      border-radius: ${CONFIG.borderRadius};
      transition: height ${CONFIG.transitionSpeed}ms ease,
                  background ${CONFIG.transitionSpeed}ms linear,
                  box-shadow ${CONFIG.transitionSpeed}ms ease;
      background: var(--tab-color-inactive, transparent);
      height: calc(var(--inactive-height,0.85) * 100%);
      box-shadow: 0 -2px 0 transparent;
    }
    .${STYLE_CLASS} .docs-sheet-tab-name {
      position: relative;
      z-index: 1;
      font-weight: 600;
      white-space: nowrap;
      pointer-events: auto;
      opacity: ${CONFIG.inactiveTextOpacity};
      transition: opacity ${CONFIG.transitionSpeed}ms linear;
    }
    .${STYLE_CLASS}.${LIGHT_TEXT_CLASS} .docs-sheet-tab-name { color: #fff; }
    .${STYLE_CLASS}.${DARK_TEXT_CLASS} .docs-sheet-tab-name { color: #000; }
    .${CSS_ONLY_CLASS} .docs-sheet-tab-name { font-weight: 600; }
    .${STYLE_CLASS}.gst-active {
      transform: scale(${CONFIG.activeScale});
    }
    .${STYLE_CLASS}.gst-active .tab-color-fill {
      background: var(--tab-color);
      height: 100% !important;
      box-shadow: ${CONFIG.activeGlow ? '0 -2px 10px var(--tab-glow, transparent)' : 'none'};
    }
    .${STYLE_CLASS}.gst-active .docs-sheet-tab-name { opacity: 1; }
    .${STYLE_CLASS}.gst-inactive:hover {
      transform: scale(${CONFIG.hoverScale});
    }
    .${STYLE_CLASS}.gst-inactive:hover .tab-color-fill {
      box-shadow: 0 -2px 8px var(--tab-hover-glow, transparent);
    }
  `;
  document.head.appendChild(style);

  /*** HELPERS ***/
  const luminance = rgb => {
    const m = rgb && rgb.match(/\d+/g);
    if (!m) return 255;
    const [r,g,b] = m.map(Number);
    return 0.299*r + 0.587*g + 0.114*b;
  };
  const rgbaWithAlpha = (rgb, alpha) => {
    const m = rgb && rgb.match(/\d+/g);
    if (!m) return rgb;
    const [r,g,b] = m.map(Number);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  /*** COLOR HANDLING ***/
  const colorCache = new WeakMap();
  const getTabColor = tab => {
    if (colorCache.has(tab)) return colorCache.get(tab);
    const el = tab.querySelector('.docs-sheet-tab-color,.docs-sheet-tab-indicator,[data-tab-color]');
    let color = el ? getComputedStyle(el).backgroundColor : null;
    if(!color || color.includes('0, 0, 0, 0')){
      switch(CONFIG.uncoloredTabsMode){
        case "skip": colorCache.set(tab,null); return null;
        case "style": color=colorCache.set(tab, CONFIG.uncoloredColor); return CONFIG.uncoloredColor;
        case "cssOnly": colorCache.set(tab,"cssOnly"); return "cssOnly";
      }
    }
    colorCache.set(tab,color);
    return color;
  };
  const invalidateColorCache = tab => colorCache.delete(tab);

  /*** CLEANUP TAB ***/
  const cleanupTab = tab => {
    tab.classList.remove(STYLE_CLASS,CSS_ONLY_CLASS,'gst-active','gst-inactive',LIGHT_TEXT_CLASS,DARK_TEXT_CLASS);
    const fill = tab.querySelector('.tab-color-fill');
    if(fill) fill.remove();
    tab.style.removeProperty('--tab-color');
    tab.style.removeProperty('--tab-color-inactive');
    tab.style.removeProperty('--tab-glow');
    tab.style.removeProperty('--tab-hover-glow');
    tab.style.removeProperty('--inactive-height');
  };

  /*** UPDATE SINGLE TAB ***/
  const updateTab = tab => {
    const name = tab.querySelector('.docs-sheet-tab-name');
    if(!name) return;
    const color = getTabColor(tab);
    if(!color){ cleanupTab(tab); return; }
    if(color==="cssOnly"){ cleanupTab(tab); tab.classList.add(CSS_ONLY_CLASS); return; }

    tab.classList.add(STYLE_CLASS);
    tab.classList.remove(CSS_ONLY_CLASS);

    let fill = tab.querySelector('.tab-color-fill');
    if(!fill){ fill=document.createElement('div'); fill.className='tab-color-fill'; tab.prepend(fill); }

    tab.style.setProperty('--tab-color',color);
    tab.style.setProperty('--tab-color-inactive',rgbaWithAlpha(color,CONFIG.inactiveOpacity));
    tab.style.setProperty('--tab-glow',rgbaWithAlpha(color,CONFIG.activeGlowStrength));
    tab.style.setProperty('--tab-hover-glow',rgbaWithAlpha(color,CONFIG.hoverGlowStrength));
    tab.style.setProperty('--inactive-height',CONFIG.inactiveHeight);

    const isDark = luminance(color)<CONFIG.minLuminanceForDarkText;
    tab.classList.toggle(LIGHT_TEXT_CLASS,isDark);
    tab.classList.toggle(DARK_TEXT_CLASS,!isDark);

    const active = tab.classList.contains('docs-sheet-active-tab') || tab.getAttribute('aria-selected')==='true';
    tab.classList.toggle('gst-active',active);
    tab.classList.toggle('gst-inactive',!active);
  };

  /*** RAF THROTTLING ***/
  let rafScheduled = false;
  const scheduledTabs = new Set();
  const scheduleUpdate = tab => {
    if(!tab) return;
    const color = getTabColor(tab);
    if(color===null) return; // skip uncolored tabs
    scheduledTabs.add(tab);
    if(rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(()=>{
      for(const t of scheduledTabs) updateTab(t);
      scheduledTabs.clear();
      rafScheduled=false;
    });
  };

  /*** OBSERVER FOR ATTRIBUTE CHANGES ***/
  const tabStrip = document.querySelector('.docs-sheet-tab-strip') || document.body;
  const observer = new MutationObserver(muts => {
    for(const m of muts){
      const tab = m.target.closest && m.target.closest('.docs-sheet-tab');
      if(!tab) continue;
      if(['class','aria-selected','data-tab-color'].includes(m.attributeName)){
        if(m.attributeName==='data-tab-color') invalidateColorCache(tab);
        scheduleUpdate(tab);
      }
    }
  });
  observer.observe(tabStrip,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-selected','data-tab-color']});

  /*** INTERSECTION OBSERVER: Only style visible tabs ***/
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting) scheduleUpdate(entry.target);
    });
  }, { root: tabStrip, threshold: 0 });

  document.querySelectorAll('.docs-sheet-tab').forEach(tab => io.observe(tab));

})();
