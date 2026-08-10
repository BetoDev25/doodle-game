let ws = null;
let matchID = null;
let role = null;
let gameInterval = null;
let opponentDoodle = null;

// ===== Screen Management =====
function showLobbyScreen() {
    document.getElementById('game-screen').innerHTML = `
        <div class="lobby-container">
            <h1>Doodle Duel</h1>
            <button id="findMatchBtn">Find Match</button>
            <div id="queueStatus" style="margin-top: 10px;"></div>
        </div>
    `;
    
    document.getElementById('findMatchBtn').addEventListener('click', startMatchmaking);
}

function showQueueScreen() {
    document.getElementById('game-screen').innerHTML = `
        <div class="lobby-container">
            <h1>Doodle Duel</h1>
            <div id="queueStatus">⏳ Searching for opponent...</div>
            <button id="cancelQueueBtn">Cancel</button>
        </div>
    `;
    
    document.getElementById('cancelQueueBtn').addEventListener('click', cancelMatchmaking);
}

function showDrawingScreen() {
    document.getElementById('game-screen').innerHTML = `
        <div class="game-container">
            <div class="container">
                <section class="controls-board">
                    <!-- Brush sizes -->
                    <div class="row">
                        <label class="title"><strong>Size</strong></label>
                        <ul class="options sizes">
                            <li class="option size-btn active" data-size="3">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="2" fill="#000" />
                                </svg>
                            </li>
                            <li class="option size-btn" data-size="6">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="5" fill="#000" />
                                </svg>
                            </li>
                            <li class="option size-btn" data-size="12">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="9" fill="#000" />
                                </svg>
                            </li>
                            <li class="option size-btn" data-size="20">
                                <svg width="24" height="24" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" fill="#000" />
                                </svg>
                            </li>
                        </ul>
                    </div>

                    <!-- Colors -->
                    <div class="row colors">
                        <label class="title"><strong>Colors</strong></label>
                        <ul class="options">
                            <li class="option selected" style="background-color: #000000;"></li>
                            <li class="option" style="background-color: #FF0000;"></li>
                            <li class="option" style="background-color: #0000FF;"></li>
                            <li class="option" style="background-color: #00FF00;"></li>
                            <li class="option" style="background-color: #FFA500;"></li>
                            <li class="option" style="background-color: #800080;"></li>
                        </ul>
                    </div>

                    <!-- Timer -->
                    <div class="row">
                        <div id="timerDisplay">⏱️ 10s</div>
                    </div>
                    <div id="phaseDisplay">Draw something!</div>
                </section>

                <section class="drawing-board">
                    <canvas id="drawing-canvas"></canvas>
                </section>
            </div>
        </div>
    `;
    
    // Initialize drawing tool
    initDrawingTool();
    connectWebSocket();
}

// ===== WebSocket =====
function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    
    ws = new WebSocket(`ws://localhost:8080/ws`);

    ws.onopen = () => {
        console.log('Connected to WebSocket');
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
    };

    ws.onclose = () => {
        console.log('Disconnected');
        ws = null;
    };
}

// ===== Message Handler =====
function handleMessage(msg) {
    switch(msg.type) {
        case 'match_found':
            handleMatchFound(msg.data);
            break;
        case 'receive_doodle':
            handleReceiveDoodle(msg.data);
            break;
        case 'match_complete':
            handleMatchComplete(msg.data);
            break;
    }
}

// ===== Game State =====
let gameState = {
    phase: 'idle',
    timer: 0,
    matchID: null,
    role: null
};

// ===== Timer =====
function updateTimer(seconds) {
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = `⏱️ ${seconds}s`;
    }
}

function updatePhase(text) {
    const phaseDisplay = document.getElementById('phaseDisplay');
    if (phaseDisplay) {
        phaseDisplay.textContent = text;
    }
}

// ===== Matchmaking =====
function startMatchmaking() {
    connectWebSocket();
    showQueueScreen();
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'join_queue' }));
    } else {
        // Wait for connection
        const checkConnection = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                clearInterval(checkConnection);
                ws.send(JSON.stringify({ type: 'join_queue' }));
            }
        }, 100);
    }
}

function cancelMatchmaking() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'leave_queue' }));
    }
    clearInterval(gameInterval);
    showLobbyScreen();
}

// ===== Match Found =====
function handleMatchFound(data) {
    matchID = data.match_id;
    role = data.role;
    gameState.matchID = matchID;
    gameState.role = role;
    
    showDrawingScreen();
    
    startDoodlePhase(10);
}

// ===== Doodle Phase =====
function startDoodlePhase(duration) {
    gameState.phase = 'doodle';
    gameState.timer = duration;
    updatePhase('🎨 Draw something!');
    updateTimer(duration);
    
    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        gameState.timer--;
        updateTimer(gameState.timer);
        
        if (gameState.timer <= 0) {
            clearInterval(gameInterval);
            submitDoodle();
        }
    }, 1000);
}

function submitDoodle() {
    updatePhase('⏳ Waiting for opponent...');
    const strokes = getStrokes();
    ws.send(JSON.stringify({
        type: 'doodle_complete',
        data: {
            match_id: matchID,
            strokes: strokes
        }
    }));
}

// ===== Finish Phase =====
function handleReceiveDoodle(data) {
    opponentDoodle = data.strokes;
    renderStrokes(data.strokes);
    startFinishPhase(60);
}

function startFinishPhase(duration) {
    gameState.phase = 'finish';
    gameState.timer = duration;
    updatePhase('✏️ Complete the drawing!');
    updateTimer(duration);

    strokes = opponentDoodle ? JSON.parse(JSON.stringify(opponentDoodle)) : [];
    
    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        gameState.timer--;
        updateTimer(gameState.timer);
        
        if (gameState.timer <= 0) {
            clearInterval(gameInterval);
            submitFinishedDrawing();
        }
    }, 1000);
}

function submitFinishedDrawing() {
    updatePhase('⏳ Sending drawing...');
    const strokes = getStrokes();
    ws.send(JSON.stringify({
        type: 'finish_drawing',
        data: {
            match_id: matchID,
            strokes: strokes
        }
    }));
}

// ===== Match Complete =====
function handleMatchComplete(data) {
    console.log('Match complete data:', data);
    clearInterval(gameInterval);
    showResultScreen(data);
}

function showResultScreen(data) {
    document.getElementById('game-screen').innerHTML = `
        <div class="result-container">
            <h2>🏆 Match Complete!</h2>
            <div style="display:flex; gap:20px; justify-content:center;">
                <div>
                    <h3>Your Drawing</h3>
                    <canvas id="yourDrawingCanvas" width="300" height="200" style="border:2px solid #ddd;"></canvas>
                </div>
                <div>
                    <h3>Opponent's Drawing</h3>
                    <canvas id="theirDrawingCanvas" width="300" height="200" style="border:2px solid #ddd;"></canvas>
                </div>
            </div>
            <button id="playAgainBtn" style="margin-top:20px; padding:10px 30px;">Play Again</button>
        </div>
    `;
    
    // Render both drawings
    renderResultDrawing('yourDrawingCanvas', data.your_drawing);
    renderResultDrawing('theirDrawingCanvas', data.their_drawing);
    
    document.getElementById('playAgainBtn').addEventListener('click', () => {
        showLobbyScreen();
    });
}

function renderResultDrawing(canvasId, strokesData) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (strokesData && strokesData.length > 0) {
        strokesData.forEach(stroke => {
            ctx.strokeStyle = stroke.color || '#000000';
            ctx.lineWidth = stroke.size || 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            if (stroke.points && stroke.points.length > 0) {
                ctx.beginPath();
                const first = stroke.points[0];
                ctx.moveTo(first.x * canvas.width, first.y * canvas.height);
                for (let i = 1; i < stroke.points.length; i++) {
                    const point = stroke.points[i];
                    ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
                }
                ctx.stroke();
            }
        });
    }
}

// ===== Initialize =====
showLobbyScreen();