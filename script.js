document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const elements = {
        startScreen: document.getElementById('start-screen'),
        gameScreen: document.getElementById('game-screen'),
        tokenOptions: document.querySelectorAll('.token-option'),
        startGameBtn: document.getElementById('start-game-btn'),
        board: document.getElementById('board'),
        player: document.getElementById('player'),
        rollBtn: document.getElementById('roll-btn'),
        diceDisplay: document.getElementById('dice'),
        statusText: document.getElementById('status'),
        winScreen: document.getElementById('win-screen'),
        playAgainBtn: document.getElementById('play-again-btn'),
        svgOverlay: document.getElementById('lines-overlay')
    };

    // --- Game Configuration & State ---
    const CONFIG = {
        maxPos: 50,
        // The New "Interesting" Layout
        greenCandles: { 
            3: 22,   // Early boost
            17: 36,  // Solid mid-game momentum
            28: 47,  // "The Moon" pump (Almost wins!)
            41: 49   // The Tease (Stops right before the finish)
        }, 
        redCandles: { 
            14: 6,   // Early mistake
            31: 11,  // Mid-game correction
            38: 20,  // Drops you right before the Moon pump
            48: 15   // The Ultimate Rug Pull (Brutal drop right at the end!)
        },    
        diceImages: [
            'assests/dice1.png', 'assests/dice2.png', 'assests/dice3.png', 
            'assests/dice4.png', 'assests/dice5.png', 'assests/dice6.png'
        ]
    };

    let state = {
        currentPos: 1,
        isMoving: false,
        selectedTokenSrc: '' // Leave this blank; we will grab it dynamically
    };

    // --- Initialization ---
    function init() {
        // Dynamically grab the exact file path and format from your HTML
        const defaultSelectedImg = document.querySelector('.token-option.selected img');
        if (defaultSelectedImg) {
            state.selectedTokenSrc = defaultSelectedImg.getAttribute('src');
        }

        createBoard();
        setupEventListeners();
    }

    // --- UI/UX: Token Selection ---
    function setupEventListeners() {
        elements.tokenOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Clear selections
                elements.tokenOptions.forEach(opt => opt.classList.remove('selected'));
                // Highlight chosen
                option.classList.add('selected');
                
                // Update state with image source
                const imgElement = option.querySelector('img');
                if (imgElement) state.selectedTokenSrc = imgElement.src;
            });
        });

        elements.startGameBtn.addEventListener('click', startGame);
        elements.rollBtn.addEventListener('click', handleRoll);
        elements.playAgainBtn.addEventListener('click', resetGame);
        
        // Debounced resize event for performance
        window.addEventListener('resize', debounce(() => {
            if(elements.gameScreen.classList.contains('active')) {
                drawBoardLines();
            }
        }, 150));
    }

    function startGame() {
        elements.player.src = state.selectedTokenSrc;
        
        elements.startScreen.classList.remove('active');
        elements.gameScreen.classList.add('active');

        // Allow DOM to render before drawing SVGs and placing token
        requestAnimationFrame(() => {
            setTimeout(() => {
                drawBoardLines();
                updatePlayerPosition(state.currentPos);
            }, 50);
        });
    }

    // --- Board Rendering ---
    function createBoard() {
        let cellsHTML = '';
        for (let row = 9; row >= 0; row--) {
            for (let col = 0; col < 5; col++) {
                let cellNum = (row % 2 === 0) 
                    ? (row * 5) + col + 1       // Left to Right
                    : (row * 5) + (4 - col) + 1; // Right to Left
                    
                cellsHTML += `<div class="cell" id="cell-${cellNum}">${cellNum}</div>`;
            }
        }
        elements.board.insertAdjacentHTML('beforeend', cellsHTML);
    }

    function getCoordinates(position) {
        const pos = Math.min(position, CONFIG.maxPos);
        const row = Math.floor((pos - 1) / 5);
        let col = (pos - 1) % 5;
        if (row % 2 !== 0) col = 4 - col;

        return { 
            x: (col * 20) + 10, // +10 targets the exact horizontal center
            y: ((9 - row) * 10) + 5 // +5 targets the exact vertical center
        };
    }

    function drawBoardLines() {
        const width = elements.board.clientWidth;
        const height = elements.board.clientHeight;
        
        if (!width || !height) return; 

        elements.svgOverlay.setAttribute('width', width);
        elements.svgOverlay.setAttribute('height', height);

        let svgHTML = '';

        const getPixels = (pos) => {
            const coords = getCoordinates(pos);
            return {
                x: (coords.x) / 100 * width, // Removed the old +10 offset
                y: (coords.y) / 100 * height // Removed the old +5 offset
            };
        };

        const drawLine = (start, end, color, extraClass = '') => {
            const p1 = getPixels(parseInt(start));
            const p2 = getPixels(end);
            svgHTML += `<line class="draw-line ${extraClass}" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${color}" stroke-width="12" stroke-linecap="round" opacity="0.85" />`;
            svgHTML += `<line class="draw-line" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="#FFFFFF" stroke-width="2" opacity="0.9" />`;
        };

        for (const [start, end] of Object.entries(CONFIG.greenCandles)) drawLine(start, end, "#00C853", "pump-glow");
        for (const [start, end] of Object.entries(CONFIG.redCandles)) drawLine(start, end, "#FF3B30");

        elements.svgOverlay.innerHTML = svgHTML;
    }

    // 3. Update the token's CSS transform to center perfectly
    function updatePlayerPosition(position, isMoving = false) {
        const { x, y } = getCoordinates(position);
        elements.player.style.left = `${x}%`;
        elements.player.style.top = `${y}%`;
        
        if (isMoving) {
            // Pins to center (-50%) and scales up for the floating animation
            elements.player.style.transform = `translate(-50%, -50%) scale(1.2)`;
        } else {
            // Pins to center (-50%) and rests normally
            elements.player.style.transform = `translate(-50%, -50%) scale(1)`;
        }
    }


    // --- Gameplay Logic ---
    // --- Gameplay Logic ---
    function handleRoll() {
        if (state.isMoving || state.currentPos >= CONFIG.maxPos) return;
        state.isMoving = true;
        
        elements.diceDisplay.classList.add('rolling');
        elements.statusText.innerText = "Trading...";

        setTimeout(() => {
            elements.diceDisplay.classList.remove('rolling');
            
            const rollIndex = Math.floor(Math.random() * 6);
            const rollValue = rollIndex + 1;
            elements.diceDisplay.src = CONFIG.diceImages[rollIndex];
            
            let newPos = state.currentPos + rollValue;
            
            // FIXED LOGIC: Cap at 50 to win immediately, no bouncing backwards!
            if (newPos > CONFIG.maxPos) {
                newPos = CONFIG.maxPos; 
            }

            elements.statusText.innerText = `Rolled a ${rollValue}!`;
            state.currentPos = newPos;
            
            updatePlayerPosition(state.currentPos, true);

            setTimeout(() => checkTriggers(state.currentPos), 900);
        }, 500);
    }

    function checkTriggers(pos) {
        let triggerHit = false;

        if (CONFIG.greenCandles[pos]) {
            elements.statusText.innerHTML = `Pump! 🟩 Riding candle up!`;
            state.currentPos = CONFIG.greenCandles[pos];
            // Brief pause before taking the pump
            setTimeout(() => updatePlayerPosition(state.currentPos, true), 300);
            triggerHit = true;
        } 
        else if (CONFIG.redCandles[pos]) {
            elements.statusText.innerHTML = `Dump! 🟥 Rug pulled!`;
            state.currentPos = CONFIG.redCandles[pos];
            // Brief pause before taking the dump
            setTimeout(() => updatePlayerPosition(state.currentPos, true), 300);
            triggerHit = true;
        }
        
        // Dynamic wait time: If a trigger was hit, we have to wait for a SECOND animation to finish
        const finalWaitTime = triggerHit ? 1200 : 100; 

        setTimeout(() => {
            if (state.currentPos === CONFIG.maxPos) {
                elements.winScreen.style.display = 'flex';
                elements.statusText.innerText = "Target hit!";
                const playerName = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || 'Trader';
                elements.winScreen.querySelector('p').innerText = `${playerName} reached the moon!`;
            }
            
            // Landed safely, remove the hover scale
            updatePlayerPosition(state.currentPos, false);
            state.isMoving = false;
            
        }, finalWaitTime); 
    }

    function resetGame() {
        // 1. Hide the win screen overlay
        elements.winScreen.style.display = 'none';
        
        // 2. Reset the game variables
        state.currentPos = 1;
        updatePlayerPosition(state.currentPos);
        elements.statusText.innerText = "Tap roll to start trading!";
        elements.diceDisplay.src = CONFIG.diceImages[0]; 

        // 3. Swap the active screens back to the landing page
        elements.gameScreen.classList.remove('active');
        elements.startScreen.classList.add('active');
    }

    // --- Utilities ---
    // Debounce function limits the rate at which a function can fire (crucial for window resizing)
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Boot up
    init();
});