document.getElementById('loadBtn').addEventListener('click', async () => {
    const matchId = document.getElementById('matchIdInput').value.trim();
    const resultDiv = document.getElementById('result');
    
    if (!matchId) {
        resultDiv.innerHTML = '<p style="color:red;">Please enter a match ID</p>';
        return;
    }

    try {
        resultDiv.innerHTML = '<p>Loading...</p>';

        const response = await fetch(`/api/view-drawings/${matchId}`);
        const data = await response.json();

        if (!response.ok) {
            resultDiv.innerHTML = `<p style="color:red;">Error: ${data.error || 'Not found'}</p>`;
            return;
        }

        resultDiv.innerHTML = `
            <div class="match-info">Match ID: ${data.match_id}</div>
            <div class="drawing-grid">
                <div class="drawing-box">
                    <h4>Player 1 - Doodle (10s)</h4>
                    <canvas id="p1Doodle" width="300" height="200"></canvas>
                </div>
                <div class="drawing-box">
                    <h4>Player 1 - Finished (60s)</h4>
                    <canvas id="p1Finished" width="300" height="200"></canvas>
                </div>
                <div class="drawing-box">
                    <h4>Player 2 - Doodle (10s)</h4>
                    <canvas id="p2Doodle" width="300" height="200"></canvas>
                </div>
                <div class="drawing-box">
                    <h4>Player 2 - Finished (60s)</h4>
                    <canvas id="p2Finished" width="300" height="200"></canvas>
                </div>
            </div>
        `;

        // Render all four drawings
        if (data.drawings && data.drawings.length === 2) {
            renderStrokesOnCanvas('p1Doodle', data.drawings[0].doodle_strokes);
            renderStrokesOnCanvas('p1Finished', data.drawings[0].finished_strokes);
            renderStrokesOnCanvas('p2Doodle', data.drawings[1].doodle_strokes);
            renderStrokesOnCanvas('p2Finished', data.drawings[1].finished_strokes);
        } else {
            resultDiv.innerHTML += '<p style="color:red;">Expected 2 drawings, got ' + (data.drawings ? data.drawings.length : 0) + '</p>';
        }

    } catch (error) {
        resultDiv.innerHTML = `<p style="color:red;">Error connecting to server</p>`;
        console.error(error);
    }
});

function renderStrokesOnCanvas(canvasId, strokesData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!strokesData || strokesData.length === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No strokes', canvas.width/2, canvas.height/2);
        return;
    }
    
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