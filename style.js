// ==UserScript==
// @name         Google Sheets Tab Style
// @namespace    http://tampermonkey.net/
// @version      3.9
// @description  Fix für Hover-Artefakte nach Klick auf Tab
// @match        https://docs.google.com/spreadsheets/*
// @grant        none
// @author       Bluelemon1
// ==/UserScript==

(() => {
  'use strict';

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
    minLuminanceForDarkText: 130
  };

  const style = document.createElement('style');
  style.textContent = `
    .tab-color-fill {
      position: absolute;
      left:0; right:0; bottom:0;
      z-index:0;
      pointer-events:none;
      border-radius: ${CONFIG.borderRadius};
      transition: height ${CONFIG.transitionSpeed}ms ease,
                  background ${CONFIG.transitionSpeed}ms linear,
                  box-shadow ${CONFIG.transitionSpeed}ms ease;
    }
    .docs-sheet-tab {
      position: relative !important;
      background: transparent !important;
      overflow: visible;
      transition: transform ${CONFIG.transitionSpeed}ms ease;
    }
    .docs-sheet-tab-name {
      position: relative;
      z-index:1;
      font-weight:600;
      white-space: nowrap;
      pointer-events:auto;
      transition: padding-top ${CONFIG.transitionSpeed}ms ease,
                  color ${CONFIG.transitionSpeed}ms linear,
                  opacity ${CONFIG.transitionSpeed}ms linear;
    }
    .docs-sheet-tab.hovering { z-index: 2; }
  `;
  document.head.appendChild(style);

  const luminance = rgb => {
    const m = rgb.match(/\d+/g);
    if (!m) return 255;
    const [r,g,b] = m.map(Number);
    return 0.299*r + 0.587*g + 0.114*b;
  };

  const rgbaWithAlpha = (rgb, alpha) => {
    const m = rgb.match(/\d+/g);
    if (!m) return rgb;
    const [r,g,b] = m.map(Number);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getTabColor = tab => {
    const el = tab.querySelector('.docs-sheet-tab-color, .docs-sheet-tab-indicator, [data-tab-color]');
    if (!el) return null;
    const color = getComputedStyle(el).backgroundColor;
    return (color && !color.includes('0, 0, 0, 0')) ? color : null;
  };

  const updateTab = tab => {
    const name = tab.querySelector('.docs-sheet-tab-name');
    const color = getTabColor(tab);
    if (!name || !color) return;

    let fill = tab.querySelector('.tab-color-fill');
    if (!fill) {
      fill = document.createElement('div');
      fill.className = 'tab-color-fill';
      tab.prepend(fill);
    }

    const active = tab.classList.contains('docs-sheet-active-tab') || tab.getAttribute('aria-selected') === 'true';
    if (active) tab.classList.remove("hovering"); // 🟢 Fix: Hover-Status sofort löschen

    const tabHeight = tab.offsetHeight;
    if (!tabHeight) return;

    const fillHeight = active ? tabHeight : Math.max(1, tabHeight * CONFIG.inactiveHeight);
    fill.style.height = fillHeight + 'px';

    const textHeight = name.offsetHeight || 0;
    let paddingTop = Math.max(0, (fillHeight - textHeight) / 2);
    name.style.paddingTop = paddingTop + 'px';

    fill.style.background = active ? color : rgbaWithAlpha(color, CONFIG.inactiveOpacity);

    name.style.color = luminance(color) < CONFIG.minLuminanceForDarkText ? '#fff' : '#000';
    name.style.opacity = active ? 1 : CONFIG.inactiveTextOpacity;

    if (active) {
      if (CONFIG.activeGlow) fill.style.boxShadow = `0 -2px 10px ${rgbaWithAlpha(color, CONFIG.activeGlowStrength)}`;
      tab.style.transform = `scale(${CONFIG.activeScale})`;
    } else if (tab.classList.contains('hovering')) {
      fill.style.boxShadow = `0 -2px 8px ${rgbaWithAlpha(color, CONFIG.hoverGlowStrength)}`;
      tab.style.transform = `scale(${CONFIG.hoverScale})`;
    } else {
      fill.style.boxShadow = 'none';
      tab.style.transform = 'scale(1)';
    }
  };

  const updateAll = () => {
    document.querySelectorAll('.docs-sheet-tab').forEach(updateTab);
  };

  let scheduled = false;
  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateAll();
    });
  };

  const observer = new MutationObserver(() => scheduleUpdate());
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'aria-selected', 'data-tab-color']
  });

  document.addEventListener('mouseover', (e) => {
    const tab = e.target.closest('.docs-sheet-tab');
    if (!tab) return;
    if (tab.classList.contains('docs-sheet-active-tab') || tab.getAttribute('aria-selected') === 'true') return;
    if (!tab.classList.contains('hovering')) {
      tab.classList.add('hovering');
      updateTab(tab);
    }
  });

  document.addEventListener('mouseout', (e) => {
    const tab = e.target.closest('.docs-sheet-tab');
    if (!tab) return;
    const rel = e.relatedTarget;
    if (rel && tab.contains(rel)) return;
    if (tab.classList.contains('hovering')) {
      tab.classList.remove('hovering');
      updateTab(tab);
    }
  });

  scheduleUpdate();
})();
