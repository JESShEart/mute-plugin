(function() {
    'use strict';

    let hidden = false;

    // Remove Spectrum's <mini-guide> sidebar: it's easy to trigger by accident,
    // and removing it also keeps the top/bottom player overlays from popping up.
    function removeMiniGuide() {
        document.querySelectorAll('mini-guide').forEach(el => el.remove());
    }

    // Observe for player changes
    const observer = new MutationObserver(() => {
        removeMiniGuide();
        if (muteOverlay.getVideoElement()) {
            muteOverlay.appendCoverToPlayer();
            if (!muteOverlay.isMuted()) {
                let videoElement = muteOverlay.getVideoElement();
                if (videoElement) {
                    videoElement.muted = false;
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Hotkey listener
    document.addEventListener('keydown', function(event) {
        if (event.key === '3') {
            muteOverlay.isMuted() ? muteOverlay.endCommercialBreak() : muteOverlay.startCommercialBreak(30);
        } else if (event.key === '2') {
            muteOverlay.isMuted() ? muteOverlay.endCommercialBreak() : muteOverlay.startCommercialBreak(120);
        } else if (event.key === '1') {
            muteOverlay.handleOneMinuteKey();
        } else if (event.key === 'ArrowLeft') {
            muteOverlay.toggleAlignment('left');
        } else if (event.key === 'ArrowRight') {
            muteOverlay.toggleAlignment('right');
        } else if (event.key === '`') {
            if (tildeOverlayModule.isShown()) {
                tildeOverlayModule.hideTildeOverlay();
            } else {
                tildeOverlayModule.showTildeOverlay();
            }
        }
    });

    // Cursor hiding functionality
    const styleEl = document.createElement("style");
    const selector =
        ":not(#👋-hide-mouse-pointer-browser-extension)" +
        ":not(#🪵🦫)" +
        ":not(#🧀🐁)" +
        ":not(#🪸🐠)" +
        ":not(#🕸️🕷️)" +
        ":not(#🥚🐓)" +
        ":not(#🌼🐝)" +
        ":not(#🍸🦐)" +
        ":not(#🪺🦜)" +
        ":not(#🩸🦇)" +
        ":not(#💦🐬)" +
        ":not(#🪱🦔)" +
        ":not(#🔪🦀)" +
        ":not(#⚽️🦭)" +
        ":not(#🍌🐒)" +
        ":not(#🍃🦥)";
    styleEl.textContent = `${selector} {cursor: none !important}`;

    function hideHandler() {
        if (hidden) return;
        hidden = true;
        document.head.appendChild(styleEl);
    }

    function showHandler() {
        if (!hidden) return;
        hidden = false;
        styleEl.remove();
    }

    const showEvents = "PointerEvent" in window
        ? ["pointerdown", "pointermove"]
        : ["mousedown", "mousemove", "touchstart", "touchmove"];
    const options = { capture: true, passive: true };

    document.addEventListener("scroll", hideHandler, options);
    document.addEventListener("keydown", hideHandler, options);

    for (const event of showEvents) {
        document.addEventListener(event, showHandler, options);
    }

    // Initialize player state on load
    removeMiniGuide();
    muteOverlay.initializePlayer();
})();
