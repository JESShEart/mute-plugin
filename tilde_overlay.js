(function() {
    'use strict';

    let tildeOverlay = null;
    const API_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

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
            let emojiType = '';
            if (isFinal) {
                emojiType = '🏆';
                if (away.winner) {
                    leftIndicator = emojiType;
                } else if (home.winner) {
                    rightIndicator = emojiType;
                } else {
                    leftIndicator = emojiType;
                    rightIndicator = emojiType;
                }
            } else if (isInProgress) {
                emojiType = '🏈';
                if (competition.situation && competition.situation.hasOwnProperty('possession')) {
                    const possessionTeamId = competition.situation.possession;
                    if (possessionTeamId === away.id) leftIndicator = emojiType;
                    if (possessionTeamId === home.id) rightIndicator = emojiType;
                } else {
                    console.log('No possession data for game:', event.name);
                }

            }

            if (leftIndicator && !rightIndicator) {
                rightIndicator = `<span class="hidden-indicator">${emojiType}</span>`;
            } else if (!leftIndicator && rightIndicator) {
                leftIndicator = `<span class="hidden-indicator">${emojiType}</span>`;
            }


            let middleContent = '';
            if (isFinal) {
                middleContent = `<div class="middle-content">${leftIndicator} @ ${rightIndicator}</div><div>Final</div>`;
            } else if (isInProgress) {
                const quarterStr = getQuarterDisplay(status.period, status.displayClock);
                const quarterLine = (quarterStr === "Halftime") ? "Halftime" : `${quarterStr} ${status.displayClock}`;
                const downParts = (competition.situation.downDistanceText || '').split(' at ');
                const downText = downParts[0] || '';
                const yardageText = downParts[1] || '';
                middleContent = `<div><span class="middle-content">${leftIndicator} @ ${rightIndicator}</span></div><div>${quarterLine}</div><div>${downText}</div>${yardageText ? `<div>on ${yardageText}</div>` : ''}`;
            } else {
                const gameDate = new Date(event.date);
                if (!isNaN(gameDate.getTime())) {
                    const options = { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true };
                    const localTime = gameDate.toLocaleTimeString('en-US', options).replace(/^0/, '');
                    const dateStr = gameDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
                    const dayName = gameDate.toLocaleDateString('en-US', { weekday: 'long' });
                    middleContent = `<div class="middle-content">@</div><div>${dayName}</div><div>${dateStr}</div><div>${localTime}</div>`;
                } else {
                    middleContent = `<div class="middle-content">@</div><div>Scheduled</div>`;
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
            gamesContainer.appendChild(gameCard);
        });
    }

    // Function to hide/remove tilde overlay
    function hideTildeOverlay() {
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