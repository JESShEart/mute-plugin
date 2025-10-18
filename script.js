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
    let tildeOverlay = null;
    const API_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

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

    // Function to show the tilde overlay
    function showTildeOverlay() {
        if (tildeOverlay) return; // Prevent duplicates

        // Create overlay div
        tildeOverlay = document.createElement('div');
        tildeOverlay.id = 'tilde-overlay';
        tildeOverlay.style.position = 'fixed';
        tildeOverlay.style.top = '0';
        tildeOverlay.style.left = '0';
        tildeOverlay.style.width = '100vw';
        tildeOverlay.style.height = '100vh';
        tildeOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        tildeOverlay.style.zIndex = '1002'; // Above coverDiv (1000) and countdownSpan (1001)
        tildeOverlay.style.display = 'flex';
        tildeOverlay.style.justifyContent = 'center';
        tildeOverlay.style.alignItems = 'center';
        tildeOverlay.style.color = '#fff';
        tildeOverlay.style.fontFamily = 'Arial, sans-serif';
        document.body.appendChild(tildeOverlay);

        // Show loading spinner
        tildeOverlay.innerHTML = `
            <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
        `;
        // Add spinner keyframes
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }

        // Fetch NFL scores
        fetch(API_URL)
            .then(response => response.json())
            .then(data => {
                renderGames(data.events || []);
            })
            .catch(error => {
                console.error('Error fetching NFL scores:', error);
                tildeOverlay.innerHTML = '<p style="font-size: 18px;">Error loading scores. Try again later.</p>';
            });
    }

    // Function to render games in flexbox grid
    function renderGames(events) {
        if (!tildeOverlay) return;

        // Clear spinner
        tildeOverlay.innerHTML = '';

        // No games message
        if (events.length === 0) {
            tildeOverlay.innerHTML = '<p style="font-size: 18px;">No NFL games this week.</p>';
            return;
        }

        // Create flex container for games
        const gamesContainer = document.createElement('div');
        gamesContainer.style.display = 'flex';
        gamesContainer.style.flexWrap = 'wrap';
        gamesContainer.style.justifyContent = 'center';
        gamesContainer.style.alignItems = 'center';
        gamesContainer.style.gap = '20px';
        gamesContainer.style.padding = '20px';
        gamesContainer.style.maxHeight = '100vh';
        gamesContainer.style.overflowY = 'auto';

        events.forEach(event => {
            const competition = event.competitions[0];
            const home = competition.competitors.find(c => c.homeAway === 'home');
            const away = competition.competitors.find(c => c.homeAway === 'away');
            const status = competition.status;
            const isFinal = status.type.name === 'STATUS_FINAL';
            const isInProgress = status.type.state === 'in';
            const quarterTime = isFinal ? 'Final' : (isInProgress ? `Q${status.period} - ${status.displayClock}` : 'Scheduled');

            // Determine winner/possession indicators
            let homeIndicator = '';
            let awayIndicator = '';
            if (isFinal) {
                if (home.winner) homeIndicator = '🏆';
                if (away.winner) awayIndicator = '🏆';
            } else if (isInProgress && competition.situation && competition.situation.possession) {
                const possessionTeamId = competition.situation.possession.id;
                if (possessionTeamId === home.id) homeIndicator = '⚽';
                if (possessionTeamId === away.id) awayIndicator = '⚽';
            }

            // Use shortDisplayName for brevity
            const homeName = home.team.shortDisplayName || home.team.displayName;
            const awayName = away.team.shortDisplayName || away.team.displayName;
            const homeLogo = home.team.logo ? `<img src="${home.team.logo}" alt="${homeName}" style="width: 40px; height: 40px;">` : '';
            const awayLogo = away.team.logo ? `<img src="${away.team.logo}" alt="${awayName}" style="width: 40px; height: 40px;">` : '';

            // Game card
            const gameCard = document.createElement('div');
            gameCard.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            gameCard.style.borderRadius = '8px';
            gameCard.style.padding = '10px';
            gameCard.style.textAlign = 'center';
            gameCard.style.minWidth = '200px';
            gameCard.style.flex = '1 1 auto';
            gameCard.innerHTML = `
                <div style="display: flex; justify-content: space-around; align-items: center;">
                    <div>${homeLogo}<br>${homeName} ${home.score} ${homeIndicator}</div>
                    <div>vs</div>
                    <div>${awayLogo}<br>${awayName} ${away.score} ${awayIndicator}</div>
                </div>
                <p style="margin-top: 5px; font-size: 14px;">${quarterTime}</p>
            `;
            gamesContainer.appendChild(gameCard);
        });

        tildeOverlay.appendChild(gamesContainer);
    }

    // Function to hide/remove tilde overlay
    function hideTildeOverlay() {
        if (tildeOverlay) {
            tildeOverlay.remove();
            tildeOverlay = null;
        }
    }

    // Hotkey listener for muting/unmuting, extending timer, toggling alignment, and NFL scores overlay
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
        } else if (event.key === '`') { // Tilde key for NFL scores overlay
            if (tildeOverlay) {
                hideTildeOverlay();
            } else {
                showTildeOverlay();
            }
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
