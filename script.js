(function() {
    'use strict';

    let coverDiv = null;
    let countdownSpan = null;
    let videoElement = null;
    let isMuted = false;
    let timeoutId = null;
    let countdownInterval = null;
    let secondsLeft = 0;
    let hidden = false;
    let colorCycleInterval = null;
    let animationFrameId = null;
    let currentColorIndex = 0;
    let alignmentState = 'full'; // 'full', 'left', or 'right'

    // Color palette for OLED burn-in protection (darker, richer colors on black)
    const colors = [
        '#1E90FF', // Deep Blue
        '#228B22', // Emerald Green
        '#DAA520', // Amber
        '#800020', // Burgundy
        '#4682B4'  // Steel Gray
    ];

    // Bouncing animation parameters
    let dx = 1; // Horizontal speed (pixels per frame, slowed down)
    let dy = 1; // Vertical speed (pixels per frame, slowed down)

    // Function to get the video element using current selectors
    function getVideoElement() {
        return document.querySelector('#spectrum-player video');
    }

    // Function to format seconds into MM:SS
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // Function to cycle to next color
    function cycleColor() {
        currentColorIndex = (currentColorIndex + 1) % colors.length;
        if (countdownSpan) {
            countdownSpan.style.color = colors[currentColorIndex];
        }
    }

    // Function to animate bouncing movement
    function animateBounce() {
        if (!countdownSpan || !coverDiv) return;

        const spanRect = countdownSpan.getBoundingClientRect();
        const coverRect = coverDiv.getBoundingClientRect();

        let newLeft = parseFloat(countdownSpan.style.left || 0) + dx;
        let newTop = parseFloat(countdownSpan.style.top || 0) + dy;

        // Bounce on horizontal edges
        if (newLeft + spanRect.width > coverRect.width || newLeft < 0) {
            dx = -dx;
            newLeft = Math.max(0, Math.min(newLeft, coverRect.width - spanRect.width));
        }

        // Bounce on vertical edges
        if (newTop + spanRect.height > coverRect.height || newTop < 0) {
            dy = -dy;
            newTop = Math.max(0, Math.min(newTop, coverRect.height - spanRect.height));
        }

        countdownSpan.style.left = `${newLeft}px`;
        countdownSpan.style.top = `${newTop}px`;

        animationFrameId = requestAnimationFrame(animateBounce);
    }

    // Function to randomize starting position and direction
    function randomizeStart() {
        if (!countdownSpan || !coverDiv) return;

        const coverRect = coverDiv.getBoundingClientRect();
        const spanRect = countdownSpan.getBoundingClientRect(); // Get after text is set

        const maxX = coverRect.width - spanRect.width;
        const maxY = coverRect.height - spanRect.height;

        const randomX = Math.random() * maxX;
        const randomY = Math.random() * maxY;

        countdownSpan.style.left = `${randomX}px`;
        countdownSpan.style.top = `${randomY}px`;

        // Randomize direction signs
        dx = Math.random() < 0.5 ? -1 : 1;
        dy = Math.random() < 0.5 ? -1 : 1;
    }

    // Function to create or get the cover div
    function getCoverDiv() {
        if (!coverDiv) {
            coverDiv = document.createElement('div');
            coverDiv.style.position = 'absolute';
            coverDiv.style.top = '0';
            coverDiv.style.left = '0';
            coverDiv.style.width = '100%';
            coverDiv.style.height = '100%';
            coverDiv.style.backgroundColor = 'black';
            coverDiv.style.zIndex = '1000';
            coverDiv.style.display = 'none';
            
            // Add smooth color transition (no position transition needed for JS animation)
            const style = document.createElement('style');
            style.textContent = `
                #commercial-cover-timer {
                    transition: color 0.5s ease-in-out;
                }
            `;
            document.head.appendChild(style);
            
            countdownSpan = document.createElement('span');
            countdownSpan.id = 'commercial-cover-timer';
            countdownSpan.style.color = colors[0]; // Start with first color
            countdownSpan.style.fontSize = '10vw';
            countdownSpan.style.fontFamily = 'Arial, sans-serif';
            countdownSpan.style.position = 'absolute';
            countdownSpan.style.zIndex = '1001';
            
            coverDiv.appendChild(countdownSpan);
        }
        return coverDiv;
    }

    // Initialize coverDiv early
    getCoverDiv();

    // Function to append coverDiv to player if not already appended
    function appendCoverToPlayer() {
        const player = document.querySelector('#spectrum-player');
        if (player && coverDiv && !coverDiv.parentElement) {
            player.appendChild(coverDiv);
        }
    }

    // Function to ensure player is unmuted and uncovered on load
    function initializePlayer() {
        videoElement = getVideoElement();
        if (videoElement) {
            videoElement.muted = false;
            isMuted = false;
        }
        const cover = getCoverDiv();
        cover.style.display = 'none';
        countdownSpan.textContent = '';
        appendCoverToPlayer();
    }

    // Function to toggle overlay width and alignment
    function toggleAlignment(direction) {
        if (!coverDiv || coverDiv.style.display === 'none' || !['left', 'right'].includes(direction)) return;

        const targetState = direction === 'left' ? 'right' : 'left';
        if (alignmentState === targetState) {
            // Restore to full width
            coverDiv.style.width = '100%';
            coverDiv.style.left = '0';
            alignmentState = 'full';
        } else {
            // Shrink to 66% with appropriate alignment
            coverDiv.style.width = '66%';
            coverDiv.style.left = direction === 'left' ? '34%' : '0';
            alignmentState = targetState;
        }
        randomizeStart(); // Adjust bouncing position for new dimensions
    }

    // Function to start commercial break handling
    function startCommercialBreak(durationInSeconds) {
        videoElement = getVideoElement();
        if (!videoElement) return;

        // Clear any existing intervals and timeouts to prevent overlap
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (colorCycleInterval) {
            clearInterval(colorCycleInterval);
            colorCycleInterval = null;
        }
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Mute
        videoElement.muted = true;
        isMuted = true;

        // Ensure coverDiv is appended
        appendCoverToPlayer();

        // Cover and start countdown
        const cover = getCoverDiv();
        cover.style.display = 'block'; // Use block to allow absolute positioning of child
        secondsLeft = durationInSeconds;
        countdownSpan.textContent = formatTime(secondsLeft);
        
        // Randomize starting position and direction
        randomizeStart();
        
        // Start bouncing animation
        animateBounce();
        
        // Start color cycling every 2 seconds
        colorCycleInterval = setInterval(cycleColor, 2000);

        // Update countdown every second
        countdownInterval = setInterval(() => {
            secondsLeft--;
            if (secondsLeft >= 0) {
                countdownSpan.textContent = formatTime(secondsLeft);
            } else {
                clearInterval(countdownInterval);
                countdownInterval = null;
                endCommercialBreak();
            }
        }, 1000);

        // Set timeout to end the break
        timeoutId = setTimeout(endCommercialBreak, durationInSeconds * 1000);
    }

    // Function to extend timer by 1 minute or start a new 1-minute timer
    function handleOneMinuteKey() {
        if (!isMuted) {
            // Start a new 1-minute timer
            startCommercialBreak(60);
        } else if (timeoutId) {
            // Add 1 minute to existing timer
            clearTimeout(timeoutId);
            secondsLeft += 60;
            countdownSpan.textContent = formatTime(secondsLeft);
            timeoutId = setTimeout(endCommercialBreak, secondsLeft * 1000);
        }
    }

    // Function to end commercial break
    function endCommercialBreak() {
        videoElement = getVideoElement();
        if (!videoElement) return;

        // Unmute
        videoElement.muted = false;
        isMuted = false;

        // Stop all intervals and animations
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (colorCycleInterval) {
            clearInterval(colorCycleInterval);
            colorCycleInterval = null;
        }
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }

        // Uncover and reset
        const cover = getCoverDiv();
        cover.style.display = 'none';
        countdownSpan.textContent = '';
        currentColorIndex = 0;
        countdownSpan.style.color = colors[0];

        secondsLeft = 0;
        alignmentState = 'full';
        coverDiv.style.width = '100%';
        coverDiv.style.left = '0';
    }

    // Hotkey listener for muting/unmuting, extending timer, and toggling alignment
    document.addEventListener('keydown', function(event) {
        if (event.key === '3') { // 30 seconds
            isMuted ? endCommercialBreak() : startCommercialBreak(30);
        } else if (event.key === '2') { // 2 minutes
            isMuted ? endCommercialBreak() : startCommercialBreak(120);
        } else if (event.key === '1') { // 1 minute or add 1 minute
            handleOneMinuteKey();
        } else if (event.key === 'ArrowLeft') { // Left arrow to toggle right-aligned 66% width
            toggleAlignment('left');
        } else if (event.key === 'ArrowRight') { // Right arrow to toggle left-aligned 66% width
            toggleAlignment('right');
        }
    });

    // Observe for player changes (in case player is dynamically loaded)
    const observer = new MutationObserver(() => {
        if (getVideoElement()) {
            appendCoverToPlayer();
            if (!isMuted) {
                videoElement = getVideoElement();
                if (videoElement) {
                    videoElement.muted = false;
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

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
        document.head.append(styleEl);
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
    initializePlayer();
})();
