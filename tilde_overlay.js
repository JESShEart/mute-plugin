(function() {
    'use strict';

    let tildeOverlay = null;
    let resizeObserver = null;
    let fitFrame = null;
    const API_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

    // ---------------------------------------------------------------------
    // Emoji icons
    //
    // Each platform ships different emoji artwork with different glyph
    // metrics (Noto Color Emoji on Linux is noticeably wider/taller than
    // Apple Color Emoji), which used to push the "🏆 @ 🏆" row around.
    // We draw the platform's own emoji onto a canvas once, crop it to its
    // visible pixels, and show it inside a fixed 1em x 1em box. Layout no
    // longer depends on the emoji font at all, and every platform's artwork
    // is scaled to the same visual size.
    // ---------------------------------------------------------------------
    const EMOJI_FONT_STACK = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';
    const emojiCache = new Map();

    function rasterizeEmoji(emoji) {
        if (emojiCache.has(emoji)) return emojiCache.get(emoji);

        let cropped = null;
        try {
            const fontPx = 160;          // big enough to stay sharp when zoomed up
            const size = fontPx * 2;     // generous padding so nothing gets clipped
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.font = `${fontPx}px ${EMOJI_FONT_STACK}`;
            ctx.fillStyle = '#fff';      // only matters if a monochrome fallback glyph is used
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, size / 2, size / 2);

            // Find the bounding box of the pixels that were actually drawn.
            const { data } = ctx.getImageData(0, 0, size, size);
            let minX = size, minY = size, maxX = -1, maxY = -1;
            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    if (data[(y * size + x) * 4 + 3] > 8) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (maxX >= 0) {
                const w = maxX - minX + 1;
                const h = maxY - minY + 1;
                cropped = document.createElement('canvas');
                cropped.width = w;
                cropped.height = h;
                cropped.getContext('2d').drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
            }
        } catch (error) {
            console.warn('Could not rasterize emoji, falling back to text:', error);
        }

        emojiCache.set(emoji, cropped);
        return cropped;
    }

    // Markup for a fixed-size icon slot. An empty slot keeps its space so the
    // "@" stays centered whether zero, one, or both sides have an icon.
    function emojiSlot(emoji) {
        return emoji
            ? `<span class="emoji-icon" data-emoji="${emoji}"></span>`
            : '<span class="emoji-icon"></span>';
    }

    // Fill in the emoji slots after a card's innerHTML has been set.
    function hydrateEmojiIcons(root) {
        root.querySelectorAll('.emoji-icon[data-emoji]').forEach(slot => {
            const emoji = slot.dataset.emoji;
            const source = rasterizeEmoji(emoji);
            if (source) {
                // A <canvas> (not a data: URL image) so the page's CSP can't block it.
                const icon = document.createElement('canvas');
                icon.width = source.width;
                icon.height = source.height;
                icon.getContext('2d').drawImage(source, 0, 0);
                icon.setAttribute('role', 'img');
                icon.setAttribute('aria-label', emoji);
                slot.appendChild(icon);
            } else {
                slot.classList.add('emoji-icon--text');
                slot.textContent = emoji;
            }
        });
    }

    // ---------------------------------------------------------------------
    // Fit-to-screen
    //
    // Cards are laid out at their natural (design) size, then the whole grid
    // is zoomed so it fills as much of the player as possible. We try every
    // column count and keep the one that allows the largest zoom; for 15
    // games on a 16:9 player that is 4 columns (4/4/4/3, last row centered).
    // Re-runs whenever the player is resized (fullscreen <-> windowed).
    // ---------------------------------------------------------------------
    const MIN_ZOOM = 0.3;
    const MAX_ZOOM = 4;

    function fitGamesToOverlay() {
        fitFrame = null;
        if (!tildeOverlay) return;
        const container = tildeOverlay.querySelector('.games-container');
        const firstCard = container && container.querySelector('.game-card');
        if (!firstCard) return;

        const availW = tildeOverlay.clientWidth;
        const availH = tildeOverlay.clientHeight;
        if (!availW || !availH) return;

        // Measure at natural size.
        container.style.zoom = '1';
        const styles = getComputedStyle(container);
        const gap = parseFloat(styles.columnGap) || 0;
        const padX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
        const cardW = firstCard.offsetWidth;
        const count = container.children.length;

        let best = null;
        for (let cols = 1; cols <= count; cols++) {
            // Skip column counts that give the same number of rows as a
            // narrower layout (e.g. 8 vs 9 columns for 15 games).
            if (cols > 1 && Math.ceil(count / cols) === Math.ceil(count / (cols - 1))) continue;

            const width = cols * cardW + (cols - 1) * gap + padX;
            container.style.width = `${width}px`;
            const height = container.offsetHeight;
            const zoom = Math.min(availW / width, availH / height);
            if (!best || zoom > best.zoom) best = { cols, width, zoom };
        }

        container.style.width = `${best.width}px`;
        // Shave a hair off so sub-pixel rounding never triggers a scrollbar.
        const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, best.zoom * 0.995));
        container.style.zoom = String(zoom);
    }

    function scheduleFit() {
        if (fitFrame) cancelAnimationFrame(fitFrame);
        fitFrame = requestAnimationFrame(fitGamesToOverlay);
    }

    // Helper function to get quarter display with superscript suffix
    function getQuarterDisplay(period, displayClock) {
        const getSuffix = (n) => {
            if (n % 10 === 1 && n % 100 !== 11) return 'st';
            if (n % 10 === 2 && n % 100 !== 12) return 'nd';
            if (n % 10 === 3 && n % 100 !== 13) return 'rd';
            return 'th';
        };

        if (period === 2 && displayClock === "0:00") {
            return "Halftime";
        } else if (period <= 4) {
            const suffix = getSuffix(period);
            return `${period}<sup>${suffix}</sup>`;
        } else {
            const otNum = period - 4;
            const suffix = getSuffix(otNum);
            return `${otNum}<sup>${suffix}</sup> OT`;
        }
    }

    // Function to show the tilde overlay
    function showTildeOverlay() {
        if (tildeOverlay) return;

        const player = document.querySelector('#spectrum-player');
        if (!player) return;

        tildeOverlay = document.createElement('div');
        tildeOverlay.id = 'tilde-overlay';
        tildeOverlay.className = 'overlay-container';
        player.appendChild(tildeOverlay);

        // Add click event to close overlay and stop propagation
        tildeOverlay.addEventListener('click', (event) => {
            event.stopPropagation();
            hideTildeOverlay();
        });

        tildeOverlay.innerHTML = `
            <div class="spinner"></div>
        `;

        // Re-fit the grid whenever the player changes size (e.g. fullscreen).
        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(scheduleFit);
            resizeObserver.observe(tildeOverlay);
        }

        fetch(`${API_URL}?t=${Date.now()}`) // Cache-buster
            .then(response => response.json())
            .then(data => {
                renderGames(data.events || []);
            })
            .catch(error => {
                console.error('Error fetching NFL scores:', error);
                tildeOverlay.innerHTML = '<p class="error-message">Error loading scores. Try again later.</p>';
            });
    }

    // Function to render games in flexbox grid
    function renderGames(events) {
        if (!tildeOverlay) return;

        tildeOverlay.innerHTML = '';

        if (events.length === 0) {
            tildeOverlay.innerHTML = '<p class="no-games-message">No NFL games this week.</p>';
            return;
        }

        const gamesContainer = document.createElement('div');
        gamesContainer.className = 'games-container';
        tildeOverlay.appendChild(gamesContainer);

        events.forEach(event => {
            const competition = event.competitions[0];
            const home = competition.competitors.find(c => c.homeAway === 'home');
            const away = competition.competitors.find(c => c.homeAway === 'away');
            const status = competition.status;
            const isFinal = status.type.name === 'STATUS_FINAL';
            const isInProgress = status.type.state === 'in';
            const isNotStarted = status.type.state === 'pre';
            const awayName = away.team.abbreviation || away.team.shortDisplayName || away.team.displayName;
            const homeName = home.team.abbreviation || home.team.shortDisplayName || home.team.displayName;
            const awayLogo = away.team.logo ? `<img src="${away.team.logo}" alt="${awayName}" class="team-logo">` : '';
            const homeLogo = home.team.logo ? `<img src="${home.team.logo}" alt="${homeName}" class="team-logo">` : '';

            // Extract overall records
            const getOverallRecord = (competitor) => {
                const overallRecord = competitor.records.find(r => r.name === 'overall');
                if (overallRecord && overallRecord.summary) {
                    const parts = overallRecord.summary.split('-');
                    const w = parts[0];
                    const l = parts[1];
                    const t = parts[2] || '0';
                    return t > 0 ? `${w}-${l}-${t}` : `${w}-${l}`;
                }
                return '';
            };
            const awayRecord = getOverallRecord(away);
            const homeRecord = getOverallRecord(home);

            let leftIndicator = '';
            let rightIndicator = '';
            if (isFinal) {
                if (away.winner) {
                    leftIndicator = '🏆';
                } else if (home.winner) {
                    rightIndicator = '🏆';
                } else {
                    leftIndicator = '🏆';
                    rightIndicator = '🏆';
                }
            } else if (isInProgress) {
                if (competition.situation && competition.situation.hasOwnProperty('possession')) {
                    const possessionTeamId = competition.situation.possession;
                    if (possessionTeamId === away.id) leftIndicator = '🏈';
                    if (possessionTeamId === home.id) rightIndicator = '🏈';
                } else {
                    console.log('No possession data for game:', event.name);
                }
            }

            // "[icon] @ [icon]" row. Slots are fixed-size, so it's the same
            // size on every platform and in every game state.
            const indicatorRow = `<div class="middle-content">${emojiSlot(leftIndicator)}<span class="at-sign">@</span>${emojiSlot(rightIndicator)}</div>`;

            let middleContent = '';
            if (isFinal) {
                middleContent = `${indicatorRow}<div>Final</div>`;
            } else if (isInProgress) {
                const quarterStr = getQuarterDisplay(status.period, status.displayClock);
                const quarterLine = (quarterStr === "Halftime") ? "Halftime" : `${quarterStr} ${status.displayClock}`;
                const downParts = ((competition.situation && competition.situation.downDistanceText) || '').split(' at ');
                const downText = downParts[0] || '';
                const yardageText = downParts[1] || '';
                middleContent = `${indicatorRow}<div>${quarterLine}</div><div>${downText}</div>${yardageText ? `<div>on ${yardageText}</div>` : ''}`;
            } else {
                const gameDate = new Date(event.date);
                if (!isNaN(gameDate.getTime())) {
                    const options = { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true };
                    const localTime = gameDate.toLocaleTimeString('en-US', options).replace(/^0/, '');
                    const dateStr = gameDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
                    const dayName = gameDate.toLocaleDateString('en-US', { weekday: 'long' });
                    middleContent = `${indicatorRow}<div>${dayName}</div><div>${dateStr}</div><div>${localTime}</div>`;
                } else {
                    middleContent = `${indicatorRow}<div>Scheduled</div>`;
                }
            }

            // Set score display: inline for non-winners, with bullet for winners/leaders
            let awayScoreDisplay = isNotStarted ? '' : `<span class="score">${away.score}</span>`;
            let homeScoreDisplay = isNotStarted ? '' : `<span class="score">${home.score}</span>`;
            if (isFinal || isInProgress) {
                const awayScoreNum = parseInt(away.score) || 0;
                const homeScoreNum = parseInt(home.score) || 0;
                if (isFinal) {
                    if (away.winner) {
                        awayScoreDisplay = `<div class="score-container"><span class="bullet">•</span><span class="score winner">${away.score}</span></div>`;
                    } else if (home.winner) {
                        homeScoreDisplay = `<div class="score-container"><span class="bullet">•</span><span class="score winner">${home.score}</span></div>`;
                    }
                } else if (isInProgress) {
                    if (awayScoreNum > homeScoreNum) {
                        awayScoreDisplay = `<div class="score-container"><span class="bullet">○</span><span class="score">${away.score}</span></div>`;
                    } else if (homeScoreNum > awayScoreNum) {
                        homeScoreDisplay = `<div class="score-container"><span class="bullet">○</span><span class="score">${home.score}</span></div>`;
                    }
                }
            }

            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            gameCard.innerHTML = `
                <div class="team-info">
                    ${awayLogo}<span class="team-name">${awayName}</span><span class="record">${awayRecord}</span>${awayScoreDisplay}
                </div>
                <div class="middle-info">
                    ${middleContent}
                </div>
                <div class="team-info">
                    ${homeLogo}<span class="team-name">${homeName}</span><span class="record">${homeRecord}</span>${homeScoreDisplay}
                </div>
            `;
            hydrateEmojiIcons(gameCard);
            gamesContainer.appendChild(gameCard);
        });

        fitGamesToOverlay();
    }

    // Function to hide/remove tilde overlay
    function hideTildeOverlay() {
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }
        if (fitFrame) {
            cancelAnimationFrame(fitFrame);
            fitFrame = null;
        }
        if (tildeOverlay) {
            tildeOverlay.remove();
            tildeOverlay = null;
        }
    }

    window.tildeOverlayModule = {
        hideTildeOverlay,
        isShown: () => !!tildeOverlay,
        showTildeOverlay
    };
})();
