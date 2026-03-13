document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const elements = {
    startScreen: document.getElementById("start-screen"),
    gameScreen: document.getElementById("game-screen"),
    tokenOptions: document.querySelectorAll(".token-option"),
    startGameBtn: document.getElementById("start-game-btn"),
    board: document.getElementById("board"),
    player: document.getElementById("player"),
    rollBtn: document.getElementById("roll-btn"),
    diceDisplay: document.getElementById("dice"),
    statusText: document.getElementById("status"),
    winScreen: document.getElementById("win-screen"),
    playAgainBtn: document.getElementById("play-again-btn"),
    goHomeBtn: document.getElementById("go-home-btn"), // Reference to your new button
    claimSbtBtn: document.getElementById("claim-sbt-btn"),
    svgOverlay: document.getElementById("lines-overlay"),
  };

  // --- Screen Management Logic ---
  function showScreen(screenId) {
    // 1. Hide all main screens
    elements.startScreen.classList.remove("active");
    elements.gameScreen.classList.remove("active");

    // 2. Show only the one requested
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add("active");
    }
  }

  // --- Play Again Logic ---
  elements.playAgainBtn.addEventListener("click", () => {
    // Reset game logic
    state.currentPos = 0;
    state.isMoving = false;

    // UI Resets
    elements.winScreen.style.display = "none";
    elements.claimSbtBtn.style.display = "block";
    elements.claimSbtBtn.innerText = "Claim Winner Sticker 🏆";
    elements.claimSbtBtn.disabled = false;
    document.getElementById("badge-container").innerHTML = "";

    // Refresh Vault and go to start
    loadBadges();
    showScreen("start-screen");
  });

  // --- Go to Home Logic ---
  // --- Go to Home Logic ---
  elements.goHomeBtn.addEventListener("click", () => {
    // 1. Reset Game Logic
    state.currentPos = 0;
    state.isMoving = false;

    // 2. IMPORTANT: Hide the Win Screen Overlay
    elements.winScreen.style.display = "none";

    // 3. Reset the "Claim" button UI for next time
    elements.claimSbtBtn.style.display = "block";
    elements.claimSbtBtn.innerText = "Claim Winner Sticker 🏆";
    elements.claimSbtBtn.disabled = false;
    document.getElementById("badge-container").innerHTML = "";

    // 4. Refresh the Vault data
    loadBadges();

    // 5. Explicitly switch to the start screen
    showScreen("start-screen");

    // 6. Optional: Reset status text for the next round
    elements.statusText.innerText = "Select a token to begin";
  });

  // --- Game Configuration & State ---
  const CONFIG = {
    maxPos: 50,
    // The New "Interesting" Layout
    greenCandles: {
      3: 22, // Early boost
      17: 36, // Solid mid-game momentum
      28: 47, // "The Moon" pump (Almost wins!)
      41: 49, // The Tease (Stops right before the finish)
    },
    redCandles: {
      14: 6, // Early mistake
      31: 11, // Mid-game correction
      38: 20, // Drops you right before the Moon pump
      48: 15, // The Ultimate Rug Pull (Brutal drop right at the end!)
    },
    diceImages: [
      "assets/dice1.png",
      "assets/dice2.png",
      "assets/dice3.png",
      "assets/dice4.png",
      "assets/dice5.png",
      "assets/dice6.png",
    ],
  };

  let state = {
    currentPos: 1,
    isMoving: false,
    selectedTokenSrc: "", // Leave this blank; we will grab it dynamically
  };

  // --- Initialization ---
  function init() {
    // Dynamically grab the exact file path and format from your HTML
    const defaultSelectedImg = document.querySelector(
      ".token-option.selected img",
    );
    if (defaultSelectedImg) {
      state.selectedTokenSrc = defaultSelectedImg.getAttribute("src");
    }

    createBoard();
    setupEventListeners();
  }

  // --- UI/UX: Token Selection ---
  function setupEventListeners() {
    elements.tokenOptions.forEach((option) => {
      option.addEventListener("click", () => {
        // Clear selections
        elements.tokenOptions.forEach((opt) =>
          opt.classList.remove("selected"),
        );
        // Highlight chosen
        option.classList.add("selected");

        // Update state with image source
        const imgElement = option.querySelector("img");
        if (imgElement) state.selectedTokenSrc = imgElement.src;
      });
    });

    elements.startGameBtn.addEventListener("click", startGame);
    elements.rollBtn.addEventListener("click", handleRoll);
    elements.playAgainBtn.addEventListener("click", resetGame);

    // Debounced resize event for performance
    window.addEventListener(
      "resize",
      debounce(() => {
        if (elements.gameScreen.classList.contains("active")) {
          drawBoardLines();
        }
      }, 150),
    );
  }

  function startGame() {
    elements.player.src = state.selectedTokenSrc;

    elements.startScreen.classList.remove("active");
    elements.gameScreen.classList.add("active");

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
    let cellsHTML = "";
    for (let row = 9; row >= 0; row--) {
      for (let col = 0; col < 5; col++) {
        let cellNum =
          row % 2 === 0
            ? row * 5 + col + 1 // Left to Right
            : row * 5 + (4 - col) + 1; // Right to Left

        cellsHTML += `<div class="cell" id="cell-${cellNum}">${cellNum}</div>`;
      }
    }
    elements.board.insertAdjacentHTML("beforeend", cellsHTML);
  }

  function getCoordinates(position) {
    const pos = Math.min(position, CONFIG.maxPos);
    const row = Math.floor((pos - 1) / 5);
    let col = (pos - 1) % 5;
    if (row % 2 !== 0) col = 4 - col;

    return {
      x: col * 20 + 10, // +10 targets the exact horizontal center
      y: (9 - row) * 10 + 5, // +5 targets the exact vertical center
    };
  }

  function drawBoardLines() {
    const width = elements.board.clientWidth;
    const height = elements.board.clientHeight;

    if (!width || !height) return;

    elements.svgOverlay.setAttribute("width", width);
    elements.svgOverlay.setAttribute("height", height);

    // 1. Define MINIMALIST Neon Glow Filters (stdDeviation reduced to 2 for a tighter aura)
    let svgHTML = `
        <defs>
            <filter id="green-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="red-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
    `;

    const getPixels = (pos) => {
      const coords = getCoordinates(pos);
      return {
        x: (coords.x / 100) * width,
        y: (coords.y / 100) * height,
      };
    };

    const drawLine = (start, end, color, glowId) => {
      const p1 = getPixels(parseInt(start));
      const p2 = getPixels(end);

      // Layer A: SUBTLE OUTER AURA (Reduced width to 10 and opacity to 0.15)
      svgHTML += `<line class="draw-line" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" 
            stroke="${color}" stroke-width="10" stroke-linecap="round" opacity="0.15" filter="url(#${glowId})" />`;

      // Layer B: CLEAN SOLID CORE (Reduced width to 4 for a sharp look)
      svgHTML += `<line class="draw-line" x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" 
            stroke="${color}" stroke-width="4" stroke-linecap="round" opacity="1" />`;
    };

    // Draw Pumps (Green)
    for (const [start, end] of Object.entries(CONFIG.greenCandles)) {
      drawLine(start, end, "#00C853", "green-glow");
    }

    // Draw Dumps (Red)
    for (const [start, end] of Object.entries(CONFIG.redCandles)) {
      drawLine(start, end, "#FF3B30", "red-glow");
    }

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
  function handleRoll() {
    if (state.isMoving || state.currentPos >= CONFIG.maxPos) return;
    state.isMoving = true;

    // Start the dice spinning animation
    elements.diceDisplay.classList.add("rolling");
    elements.statusText.innerText = "Trading...";

    // 1. FIRST DELAY: Wait 500ms for the dice spinning animation to finish
    setTimeout(() => {
        elements.diceDisplay.classList.remove("rolling");

        // Calculate the result
        const rollIndex = Math.floor(Math.random() * 6);
        const rollValue = rollIndex + 1;
        
        // IMMEDIATELY show the final dice image and update the text
        elements.diceDisplay.src = CONFIG.diceImages[rollIndex];
        elements.statusText.innerText = `Rolled a ${rollValue}...`;

        // ==========================================
        // 2. THE SUSPENSE PAUSE: Wait 1 full second (1000ms)
        // ==========================================
        setTimeout(() => {
            
            // Calculate the exact distance needed
            const stepsToWin = CONFIG.maxPos - state.currentPos;

            // --- EXACT ROLL TO WIN LOGIC ---
            if (rollValue === stepsToWin) {
                // Perfect roll! Move to 50 and win
                state.currentPos = CONFIG.maxPos;
                elements.statusText.innerText = `Target Hit!`;
                updatePlayerPosition(state.currentPos, true);
                
                // Wait for the CSS glide to finish before checking win
                setTimeout(() => checkTriggers(state.currentPos), 1600);
                
            } else if (rollValue < stepsToWin) {
                // Normal move
                state.currentPos += rollValue;
                elements.statusText.innerText = `Moving ${rollValue} steps!`;
                updatePlayerPosition(state.currentPos, true);
                
                // Wait for the CSS glide to finish before checking candles
                setTimeout(() => checkTriggers(state.currentPos), 1600);
                
            } else {
                // Roll was too high (e.g., at 49, rolled a 4)
                elements.statusText.innerText = `Rolled too high... Need exactly ${stepsToWin} to win!`;
                state.isMoving = false; // Player stays put, allow them to roll again
            }

        }, 1000); // <-- This is the 1-second pause before the player moves

    }, 500); // <-- This is your original 500ms dice animation delay
}

  function checkTriggers(pos) {
    let triggerHit = false;

    if (CONFIG.greenCandles[pos]) {
      elements.statusText.innerHTML = `Pump! 🟩 Riding candle up!`;
      state.currentPos = CONFIG.greenCandles[pos];
      // Brief pause before taking the pump
      setTimeout(() => updatePlayerPosition(state.currentPos, true), 300);
      triggerHit = true;
    } else if (CONFIG.redCandles[pos]) {
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
        elements.winScreen.style.display = "flex";
        elements.statusText.innerText = "Target hit!";
        const playerName =
          window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || "Trader";
        elements.winScreen.querySelector("p").innerText =
          `${playerName} reached the moon!`;
      }

      // Landed safely, remove the hover scale
      updatePlayerPosition(state.currentPos, false);
      state.isMoving = false;
    }, finalWaitTime);
  }

  function resetGame() {
    // 1. Hide the win screen overlay
    elements.winScreen.style.display = "none";
    document.getElementById("claim-sbt-btn").style.display = "block";
    document.getElementById("claim-sbt-btn").innerText = "Claim Winner SBT 🏆";
    document.getElementById("claim-sbt-btn").disabled = false;
    document.getElementById("badge-container").innerHTML = ""; // Clears the badge
    document.getElementById("win-message").innerText =
      "You've reached the goal! Claim your proof of win.";

    // 2. Reset the game variables
    state.currentPos = 1;
    updatePlayerPosition(state.currentPos);
    elements.statusText.innerText = "Tap roll to start trading!";
    elements.diceDisplay.src = CONFIG.diceImages[0];

    // 3. Swap the active screens back to the landing page
    elements.gameScreen.classList.remove("active");
    elements.startScreen.classList.add("active");
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

// ==========================================
// --- DUMMY SBT (SOULBOUND TOKEN) LOGIC ---
// ==========================================

// ==========================================
// --- DOG STICKER COLLECTION LOGIC ---
// ==========================================

// Array of your sticker paths
const DOG_STICKERS = [
  "stickers/dogs-sticker1.webp",
  "stickers/dogs-sticker2.webp",
  "stickers/dogs-sticker3.webp",
  "stickers/dogs-sticker4.webp",
  "stickers/dogs-sticker5.webp",
];

function handleClaimSBT() {
  const btn = document.getElementById("claim-sbt-btn");
  if (!btn) return;

  btn.innerText = "Minting Sticker...";
  btn.disabled = true;

  setTimeout(() => {
    const randomSticker =
      DOG_STICKERS[Math.floor(Math.random() * DOG_STICKERS.length)];
    let collection = JSON.parse(
      localStorage.getItem("ton_crusher_collection") || "[]",
    );

    collection.push(randomSticker);
    localStorage.setItem("ton_crusher_collection", JSON.stringify(collection));

    btn.style.display = "none";
    document.getElementById("badge-container").innerHTML = `
            <div class="sbt-badge">
                <img src="${randomSticker}" alt="Dog Sticker" class="sticker-img" />
            </div>
        `;
    document.getElementById("win-message").innerText =
      "Sticker safely stored in your vault!";

    // Refresh the Vault data immediately in the background
    loadBadges();
  }, 1500);
}

function loadBadges() {
  let collection = JSON.parse(
    localStorage.getItem("ton_crusher_collection") || "[]",
  );
  const badgeDisplay = document.getElementById("badge-display");
  const vaultSection = document.querySelector(".vault-section");

  if (!badgeDisplay || !vaultSection) return;

  if (collection.length > 0) {
    const stickersHTML = collection
      .map(
        (imgSrc) =>
          `<img src="${imgSrc}" class="vault-sticker" alt="Collected Dog" />`,
      )
      .join("");

    const uniqueDogs = [...new Set(collection)].length;

    if (uniqueDogs === 5) {
      vaultSection.classList.add("vault-completed");
      badgeDisplay.innerHTML = `
                <div class="vault-grid">${stickersHTML}</div>
                <div class="vault-stats master-stats">👑 MASTER COLLECTOR: 5/5</div>
            `;
    } else {
      vaultSection.classList.remove("vault-completed");
      badgeDisplay.innerHTML = `
                <div class="vault-grid">${stickersHTML}</div>
                <div class="vault-stats">🎒 Total: ${collection.length} | 🌟 Unique: ${uniqueDogs}/5</div>
            `;
    }
  }
}

document
  .getElementById("claim-sbt-btn")
  .addEventListener("click", handleClaimSBT);

// Ensure Vault loads whenever the page is opened/refreshed
window.addEventListener("load", loadBadges);
