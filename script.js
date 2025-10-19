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

    // Color palette for OLED burn-in protection
    const colors = [
        '#1E90FF', // Deep Blue
        '#228B22', // Emerald Green
        '#DAA520', // Amber
        '#800020', // Burgundy
        '#4682B4'  // Steel Gray
    ];

    // Bouncing animation parameters
    let dx = 1; // Horizontal speed
    let dy = 1; // Vertical speed

    // Function to get the video element
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

        if (newLeft + spanRect.width > coverRect.width || newLeft < 0) {
            dx = -dx;
            newLeft = Math.max(0, Math.min(newLeft, coverRect.width - spanRect.width));
        }
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
        const spanRect = countdownSpan.getBoundingClientRect();

        const maxX = coverRect.width - spanRect.width;
        const maxY = coverRect.height - spanRect.height;

        const randomX = Math.random() * maxX;
        const randomY = Math.random() * maxY;

        countdownSpan.style.left = `${randomX}px`;
        countdownSpan.style.top = `${randomY}px`;

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
            
            // Add click event to stop propagation
            coverDiv.addEventListener('click', (event) => {
                event.stopPropagation();
            });

            const style = document.createElement('style');
            style.textContent = `
                #commercial-cover-timer {
                    transition: color 0.5s ease-in-out;
                }
            `;
            document.head.appendChild(style);
            
            countdownSpan = document.createElement('span');
            countdownSpan.id = 'commercial-cover-timer';
            countdownSpan.style.color = colors[0];
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

    // Function to append coverDiv to player
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
            coverDiv.style.width = '100%';
            coverDiv.style.left = '0';
            alignmentState = 'full';
        } else {
            coverDiv.style.width = '66%';
            coverDiv.style.left = direction === 'left' ? '34%' : '0';
            alignmentState = targetState;
        }
        randomizeStart();
    }

    // Function to start commercial break
    function startCommercialBreak(durationInSeconds) {
        videoElement = getVideoElement();
        if (!videoElement) return;

        if (timeoutId) clearTimeout(timeoutId);
        if (countdownInterval) clearInterval(countdownInterval);
        if (colorCycleInterval) clearInterval(colorCycleInterval);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        videoElement.muted = true;
        isMuted = true;

        appendCoverToPlayer();

        const cover = getCoverDiv();
        cover.style.display = 'block';
        secondsLeft = durationInSeconds;
        countdownSpan.textContent = formatTime(secondsLeft);
        
        randomizeStart();
        animateBounce();
        colorCycleInterval = setInterval(cycleColor, 2000);

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

        timeoutId = setTimeout(endCommercialBreak, durationInSeconds * 1000);
    }

    // Function to extend timer by 1 minute or start a new 1-minute timer
    function handleOneMinuteKey() {
        if (!isMuted) {
            startCommercialBreak(60);
        } else if (timeoutId) {
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

        videoElement.muted = false;
        isMuted = false;

        if (countdownInterval) clearInterval(countdownInterval);
        if (colorCycleInterval) clearInterval(colorCycleInterval);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (timeoutId) clearTimeout(timeoutId);

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
        if (tildeOverlay) return;

        const player = document.querySelector('#spectrum-player');
        if (!player) return;

        tildeOverlay = document.createElement('div');
        tildeOverlay.id = 'tilde-overlay';
        tildeOverlay.style.position = 'absolute';
        tildeOverlay.style.top = '0';
        tildeOverlay.style.left = '0';
        tildeOverlay.style.width = '100%';
        tildeOverlay.style.height = '100%';
        tildeOverlay.style.zIndex = '1002';
        tildeOverlay.style.display = 'flex';
        tildeOverlay.style.justifyContent = 'center';
        tildeOverlay.style.alignItems = 'center';
        tildeOverlay.style.color = '#fff';
        tildeOverlay.style.fontFamily = 'Arial, sans-serif';
        tildeOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        player.appendChild(tildeOverlay);

        // Add click event to close overlay and stop propagation
        tildeOverlay.addEventListener('click', (event) => {
            event.stopPropagation();
            hideTildeOverlay();
        });

        tildeOverlay.innerHTML = `
            <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
        `;
        if (!document.getElementById('spinner-style')) {
            const style = document.createElement('style');
            style.id = 'spinner-style';
            style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }

        fetch(API_URL)
            .then(response => response.json())
            .then(data => {
                renderGames(data.events || []);
            })
            .catch(error => {
                console.error('Error fetching NFL scores:', error);
                tildeOverlay.innerHTML = '<p style="font-size: min(3vmin, 18px);">Error loading scores. Try again later.</p>';
            });
    }

    // Function to render games in flexbox grid
    function renderGames(events) {
        if (!tildeOverlay) return;

        tildeOverlay.innerHTML = '';

        if (events.length === 0) {
            tildeOverlay.innerHTML = '<p style="font-size: min(3vmin, 18px);">No NFL games this week.</p>';
            return;
        }

        const gamesContainer = document.createElement('div');
        gamesContainer.style.display = 'flex';
        gamesContainer.style.flexWrap = 'wrap';
        gamesContainer.style.justifyContent = 'center';
        gamesContainer.style.alignItems = 'center';
        gamesContainer.style.gap = 'min(2vmin, 20px)';
        gamesContainer.style.padding = 'min(2vmin, 20px)';
        gamesContainer.style.maxHeight = '100vh';
        gamesContainer.style.overflowY = 'auto';
        gamesContainer.style.boxSizing = 'border-box';

        events.forEach(event => {
            const competition = event.competitions[0];
            const home = competition.competitors.find(c => c.homeAway === 'home');
            const away = competition.competitors.find(c => c.homeAway === 'away');
            const status = competition.status;
            const isFinal = status.type.name === 'STATUS_FINAL';
            const isInProgress = status.type.state === 'in';
            const awayName = away.team.abbreviation || away.team.shortDisplayName || away.team.displayName;
            const homeName = home.team.abbreviation || home.team.shortDisplayName || home.team.displayName;
            const awayLogo = away.team.logo ? `<img src="${away.team.logo}" alt="${awayName}" style="width: min(5vmin, 40px); height: min(5vmin, 40px);">` : '';
            const homeLogo = home.team.logo ? `<img src="${home.team.logo}" alt="${homeName}" style="width: min(5vmin, 40px); height: min(5vmin, 40px);">` : '';

            let leftIndicator = '';
            let rightIndicator = '';
            let emojiType = '';
            if (isFinal) {
                emojiType = '🏆';
                if (away.winner) leftIndicator = emojiType;
                if (home.winner) rightIndicator = emojiType;
            } else if (isInProgress) {
                emojiType = '🏈';
                if (competition.situation && competition.situation.possession) {
                    const possessionTeamId = competition.situation.possession.id;
                    if (possessionTeamId === away.id) leftIndicator = emojiType;
                    if (possessionTeamId === home.id) rightIndicator = emojiType;
                }
            }

            if (leftIndicator && !rightIndicator) {
                rightIndicator = `<span style="visibility: hidden;">${emojiType}</span>`;
            } else if (!leftIndicator && rightIndicator) {
                leftIndicator = `<span style="visibility: hidden;">${emojiType}</span>`;
            }

            let middleContent = '';
            if (isFinal) {
                middleContent = `<span style="font-size: min(3vmin, 20px);">${leftIndicator} @ ${rightIndicator}</span><br>Final`;
            } else if (isInProgress) {
                middleContent = `<span style="font-size: min(3vmin, 20px);">${leftIndicator} @ ${rightIndicator}</span><br>${competition.situation.downDistanceText || ''}<br>Q${status.period} - ${status.displayClock}`;
            } else {
                const gameDate = new Date(event.date);
                if (!isNaN(gameDate.getTime())) {
                    const options = { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: true };
                    const localTime = gameDate.toLocaleTimeString('en-US', options);
                    const dateStr = gameDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
                    middleContent = `<span style="font-size: min(3vmin, 20px);">@</span><br>${dateStr}<br>${localTime}`;
                } else {
                    middleContent = `<span style="font-size: min(3vmin, 20px);">@</span><br>Scheduled`;
                }
            }

            const gameCard = document.createElement('div');
            gameCard.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
            gameCard.style.borderRadius = 'min(1vmin, 8px)';
            gameCard.style.padding = 'min(1.5vmin, 10px)';
            gameCard.style.width = 'min(30vw, 300px)';
            gameCard.style.textAlign = 'center';
            gameCard.style.display = 'flex';
            gameCard.style.flexDirection = 'row';
            gameCard.style.justifyContent = 'space-around';
            gameCard.style.alignItems = 'center';
            gameCard.style.minHeight = 'min(15vmin, 120px)';

            gameCard.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: min(15vmin, 100px); flex: 1; font-size: min(2.5vmin, 16px);">
                    ${awayLogo}<br>${awayName}<br><span style="font-size: min(4vmin, 24px); font-weight: bold;">${away.score}</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: min(15vmin, 100px); width: min(15vmin, 120px); flex: 1; font-size: min(2.5vmin, 16px);">
                    ${middleContent}
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: min(15vmin, 100px); flex: 1; font-size: min(2.5vmin, 16px);">
                    ${homeLogo}<br>${homeName}<br><span style="font-size: min(4vmin, 24px); font-weight: bold;">${home.score}</span>
                </div>
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

    // Hotkey listener
    document.addEventListener('keydown', function(event) {
        if (event.key === '3') {
            isMuted ? endCommercialBreak() : startCommercialBreak(30);
        } else if (event.key === '2') {
            isMuted ? endCommercialBreak() : startCommercialBreak(120);
        } else if (event.key === '1') {
            handleOneMinuteKey();
        } else if (event.key === 'ArrowLeft') {
            toggleAlignment('left');
        } else if (event.key === 'ArrowRight') {
            toggleAlignment('right');
        } else if (event.key === '`') {
            if (tildeOverlay) {
                hideTildeOverlay();
            } else {
                showTildeOverlay();
            }
        }
    });

    // Observe for player changes
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
