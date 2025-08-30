// ==UserScript==
// @name         Google Sheets Tab Style
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Fix for hover artifacts after clicking a tab
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
    inactiveHeight: 0.85,            // Height of inactive tabs (relative)
    inactiveOpacity: 0.8,            // Background opacity of inactive tabs
    inactiveTextOpacity: 1,          // Text opacity of inactive tabs
    activeGlow: true,                // Enable glow for active tab
    activeGlowStrength: 0.8,         // Glow intensity for active tab
    activeScale: 1.1,                // Scale factor for active tab
    hoverGlowStrength: 0.2,          // Glow intensity on hover
    hoverScale: 1.02,                // Scale factor on hover
    borderRadius: '4px 4px 0 0',     // Rounded tab corners
    transitionSpeed: 250,            // Transition duration (ms)
    minLuminanceForDarkText: 130     // Threshold: when to use black vs. white text
  };

  /*** ADD STYLESHEET ***/
  const style = document.createElement('style');
  style.textContent = `
    .tab-color-fill {
      position: absolute;
      left: 0; right: 0; bottom: 0;
      z-index: 0;
      pointer-events: none;
      border-radius: ${CONFIG.borderRadius};
      transition:
        height ${CONFIG.transitionSpeed}ms ease,
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
      z-index: 1;
      font-weight: 600;
      white-space: nowrap;
      pointer-events: auto;
      transition:
        padding-top ${CONFIG.transitionSpeed}ms ease,
        color ${CONFIG.transitionSpeed}ms linear,
        opacity ${CONFIG.transitionSpeed}ms linear;
    }
    .docs-sheet-tab.hovering {
      z-index: 2;
    }
  `;
  document.head.appendChild(style);

  /*** HELPER FUNCTIONS ***/

  // Calculate luminance of an RGB color
  const luminance = rgb => {
    const m = rgb.match(/\d+/g);
    if (!m) return 255;
    const [r, g, b] = m.map(Number);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  };

  // Add alpha channel to RGB
  const rgbaWithAlpha = (rgb, alpha) => {
    const m = rgb.match(/\d+/g);
    if (!m) return rgb;
    const [r, g, b] = m.map(Number);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Get the tab’s assigned color
  const getTabColor = tab => {
    const el = tab.querySelector('.docs-sheet-tab-color, .docs-sheet-tab-indicator, [data-tab-color]');
    if (!el) return null;
    const color = getComputedStyle(el).backgroundColor;
    return (color && !color.includes('0, 0, 0, 0')) ? color : null;
  };

  /*** UPDATE SINGLE TAB ***/
  const updateTab = tab => {
    const name = tab.querySelector('.docs-sheet-tab-name');
    const color = getTabColor(tab);

    if (!name || !color) return;

    // Create the background fill if missing
    let fill = tab.querySelector('.tab-color-fill');
    if (!fill) {
      fill = document.createElement('div');
      fill.className = 'tab-color-fill';
      tab.prepend(fill);
    }

    const active = tab.classList.contains('docs-sheet-active-tab')
                || tab.getAttribute('aria-selected') === 'true';

    // Fix: immediately remove hover state when tab is active
    if (active) tab.classList.remove("hovering");

    const tabHeight = tab.offsetHeight;
    if (!tabHeight) return;

    // Fill height
    const fillHeight = active
      ? tabHeight
      : Math.max(1, tabHeight * CONFIG.inactiveHeight);
    fill.style.height = fillHeight + 'px';

    // Vertically center text
    const textHeight = name.offsetHeight || 0;
    const paddingTop = Math.max(0, (fillHeight - textHeight) / 2);
    name.style.paddingTop = paddingTop + 'px';

    // Set background color
    fill.style.background = active
      ? color
      : rgbaWithAlpha(color, CONFIG.inactiveOpacity);

    // Choose text color (white or black)
    name.style.color = luminance(color) < CONFIG.minLuminanceForDarkText
      ? '#fff'
      : '#000';

    // Text opacity
    name.style.opacity = active ? 1 : CONFIG.inactiveTextOpacity;

    // Effects: Glow & Scaling
    if (active) {
      if (CONFIG.activeGlow) {
        fill.style.boxShadow = `0 -2px 10px ${rgbaWithAlpha(color, CONFIG.activeGlowStrength)}`;
      }
      tab.style.transform = `scale(${CONFIG.activeScale})`;

    } else if (tab.classList.contains('hovering')) {
      fill.style.boxShadow = `0 -2px 8px ${rgbaWithAlpha(color, CONFIG.hoverGlowStrength)}`;
      tab.style.transform = `scale(${CONFIG.hoverScale})`;

    } else {
      fill.style.boxShadow = 'none';
      tab.style.transform = 'scale(1)';
    }
  };

  // Update all tabs
  const updateAll = () => {
    document.querySelectorAll('.docs-sheet-tab').forEach(updateTab);
  };

  /*** MUTATION OBSERVER ***/
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

  /*** EVENTS (Hover Handling) ***/
  document.addEventListener('mouseover', e => {
    const tab = e.target.closest('.docs-sheet-tab');
    if (!tab) return;

    const isActive = tab.classList.contains('docs-sheet-active-tab')
                  || tab.getAttribute('aria-selected') === 'true';
    if (isActive) return;

    if (!tab.classList.contains('hovering')) {
      tab.classList.add('hovering');
      updateTab(tab);
    }
  });

  document.addEventListener('mouseout', e => {
    const tab = e.target.closest('.docs-sheet-tab');
    if (!tab) return;

    const rel = e.relatedTarget;
    if (rel && tab.contains(rel)) return;

    if (tab.classList.contains('hovering')) {
      tab.classList.remove('hovering');
      updateTab(tab);
    }
  });

  /*** INITIAL UPDATE ***/
  scheduleUpdate();

})();
