// BVMT-R Test Logic
class BVMTTest {
    constructor() {
        this.currentPhase = 'intro';
        this.currentTrial = 0;
        this.learningScores = [];
        this.delayedScore = 0;
        this.recognitionScore = 0;
        this.currentDrawings = [];
        this.selectedFigures = new Set();
        this.timers = {};
        
        // Define the 6 geometric figures for the stimulus
        this.stimulusFigures = [
            { id: 1, type: 'circle', color: '#FF0000' },
            { id: 2, type: 'triangle', color: '#0000FF' },
            { id: 3, type: 'square', color: '#00FF00' },
            { id: 4, type: 'diamond', color: '#FF00FF' },
            { id: 5, type: 'star', color: '#FFA500' },
            { id: 6, type: 'cross', color: '#800080' }
        ];
        
        // Define 12 figures for recognition test (6 original + 6 foils)
        this.recognitionFigures = [
            ...this.stimulusFigures,
            { id: 7, type: 'pentagon', color: '#00FFFF' },
            { id: 8, type: 'hexagon', color: '#FFD700' },
            { id: 9, type: 'oval', color: '#FF69B4' },
            { id: 10, type: 'heart', color: '#DC143C' },
            { id: 11, type: 'arrow', color: '#4B0082' },
            { id: 12, type: 'moon', color: '#2E8B57' }
        ];
    }
    
    startTest() {
        this.currentPhase = 'learning';
        this.currentTrial = 1;
        this.showPhase('learning-phase');
        this.startLearningTrial();
    }
    
    startLearningTrial() {
        document.getElementById('trial-title').textContent = `Learning Trial ${this.currentTrial}`;
        this.displayStimulus();
        this.startTimer('learning-timer', 10, () => {
            this.hideStimulus();
            this.showPhase('response-phase');
            this.startResponsePhase();
        });
    }
    
    displayStimulus() {
        const container = document.getElementById('stimulus-display');
        container.innerHTML = '';
        
        // Shuffle and display 6 figures in 2x3 grid
        const shuffled = [...this.stimulusFigures].sort(() => Math.random() - 0.5);
        
        shuffled.forEach(figure => {
            const div = document.createElement('div');
            div.className = 'figure';
            div.innerHTML = this.createSVG(figure);
            container.appendChild(div);
        });
    }
    
    hideStimulus() {
        const container = document.getElementById('stimulus-display');
        container.innerHTML = '';
        this.clearTimer('learning-timer');
    }
    
    startResponsePhase() {
        document.getElementById('response-title').textContent = `Trial ${this.currentTrial} - Draw the figures`;
        this.createResponseGrid('response-grid');
        this.startTimer('response-timer', 0, () => {}); // Just display elapsed time
    }
    
    createResponseGrid(gridId) {
        const container = document.getElementById(gridId);
        container.innerHTML = '';
        this.currentDrawings = [];
        
        for (let i = 0; i < 6; i++) {
            const cell = document.createElement('div');
            cell.className = 'response-cell';
            cell.dataset.index = i;
            
            const canvas = document.createElement('canvas');
            canvas.width = 150;
            canvas.height = 150;
            canvas.style.position = 'absolute';
            canvas.style.top = '0';
            canvas.style.left = '0';
            
            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            
            let isDrawing = false;
            let lastX = 0;
            let lastY = 0;
            
            canvas.addEventListener('mousedown', (e) => {
                isDrawing = true;
                const rect = canvas.getBoundingClientRect();
                lastX = e.clientX - rect.left;
                lastY = e.clientY - rect.top;
            });
            
            canvas.addEventListener('mousemove', (e) => {
                if (!isDrawing) return;
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
                
                lastX = x;
                lastY = y;
            });
            
            canvas.addEventListener('mouseup', () => {
                isDrawing = false;
            });
            
            canvas.addEventListener('mouseleave', () => {
                isDrawing = false;
            });
            
            cell.appendChild(canvas);
            container.appendChild(cell);
            this.currentDrawings.push(canvas);
        }
    }
    
    submitResponse() {
        const score = this.scoreDrawings();
        this.learningScores.push(score);
        
        this.showMessage(`Trial ${this.currentTrial} Score: ${score}/6`, 'info');
        
        if (this.currentTrial < 3) {
            this.currentTrial++;
            this.showPhase('learning-phase');
            setTimeout(() => this.startLearningTrial(), 2000);
        } else {
            this.startDelayPhase();
        }
    }
    
    scoreDrawings() {
        // Simple scoring: check if each cell has any drawing
        let score = 0;
        this.currentDrawings.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const hasDrawing = imageData.data.some((value, index) => {
                return index % 4 === 3 && value > 0; // Check alpha channel
            });
            if (hasDrawing) score++;
        });
        return score;
    }
    
    startDelayPhase() {
        this.showPhase('delay-phase');
        this.startTimer('delay-timer', 1500, () => { // 25 minutes = 1500 seconds
            this.startDelayedRecall();
        });
    }
    
    skipDelay() {
        this.clearTimer('delay-timer');
        this.startDelayedRecall();
    }
    
    startDelayedRecall() {
        this.showPhase('delayed-recall-phase');
        this.createResponseGrid('delayed-response-grid');
        this.startTimer('delayed-timer', 0, () => {});
    }
    
    submitDelayedResponse() {
        this.delayedScore = this.scoreDrawings();
        this.showMessage(`Delayed Recall Score: ${this.delayedScore}/6`, 'info');
        setTimeout(() => this.startRecognitionPhase(), 2000);
    }
    
    startRecognitionPhase() {
        this.showPhase('recognition-phase');
        this.displayRecognitionFigures();
    }
    
    displayRecognitionFigures() {
        const container = document.getElementById('recognition-grid');
        container.innerHTML = '';
        this.selectedFigures.clear();
        
        // Shuffle recognition figures
        const shuffled = [...this.recognitionFigures].sort(() => Math.random() - 0.5);
        
        shuffled.forEach(figure => {
            const div = document.createElement('div');
            div.className = 'recognition-figure';
            div.dataset.figureId = figure.id;
            div.innerHTML = this.createSVG(figure);
            
            div.addEventListener('click', () => {
                if (this.selectedFigures.has(figure.id)) {
                    this.selectedFigures.delete(figure.id);
                    div.classList.remove('selected');
                } else if (this.selectedFigures.size < 6) {
                    this.selectedFigures.add(figure.id);
                    div.classList.add('selected');
                } else {
                    this.showMessage('Please select exactly 6 figures', 'warning');
                }
            });
            
            container.appendChild(div);
        });
    }
    
    submitRecognition() {
        if (this.selectedFigures.size !== 6) {
            this.showMessage('Please select exactly 6 figures', 'warning');
            return;
        }
        
        // Score recognition: count correct selections
        let correct = 0;
        this.selectedFigures.forEach(id => {
            if (this.stimulusFigures.some(f => f.id === id)) {
                correct++;
            }
        });
        this.recognitionScore = correct;
        
        this.showResults();
    }
    
    showResults() {
        this.showPhase('results-phase');
        
        const totalLearning = this.learningScores.reduce((a, b) => a + b, 0);
        const avgLearning = (totalLearning / 3).toFixed(1);
        
        const scoreDisplay = document.getElementById('score-display');
        scoreDisplay.innerHTML = `
            <h3>Test Results</h3>
            <p><strong>Total Learning Score:</strong> ${totalLearning}/18</p>
            <p><strong>Average Learning Score:</strong> ${avgLearning}/6</p>
            <p><strong>Delayed Recall Score:</strong> ${this.delayedScore}/6</p>
            <p><strong>Recognition Score:</strong> ${this.recognitionScore}/6</p>
        `;
        
        const detailedScores = document.getElementById('detailed-scores');
        detailedScores.innerHTML = `
            <h4>Detailed Scores:</h4>
            <p>Trial 1: ${this.learningScores[0]}/6</p>
            <p>Trial 2: ${this.learningScores[1]}/6</p>
            <p>Trial 3: ${this.learningScores[2]}/6</p>
            <p>Learning Slope: ${this.calculateLearningSlope()}</p>
            <p>Retention Rate: ${this.calculateRetentionRate()}%</p>
        `;
    }
    
    calculateLearningSlope() {
        if (this.learningScores.length < 3) return 'N/A';
        const slope = this.learningScores[2] - this.learningScores[0];
        return slope > 0 ? `+${slope}` : slope.toString();
    }
    
    calculateRetentionRate() {
        const totalLearning = this.learningScores.reduce((a, b) => a + b, 0);
        const avgLearning = totalLearning / 3;
        const retention = avgLearning > 0 ? (this.delayedScore / avgLearning) * 100 : 0;
        return retention.toFixed(1);
    }
    
    // Helper functions
    showPhase(phaseId) {
        document.querySelectorAll('.phase').forEach(phase => {
            phase.classList.remove('active');
        });
        document.getElementById(phaseId).classList.add('active');
        this.currentPhase = phaseId;
    }
    
    startTimer(timerId, seconds, callback) {
        this.clearTimer(timerId);
        let remaining = seconds;
        const timerElement = document.getElementById(timerId);
        
        this.timers[timerId] = setInterval(() => {
            if (timerId.includes('delay')) {
                const minutes = Math.floor(remaining / 60);
                const secs = remaining % 60;
                timerElement.textContent = `Delay Time: ${minutes}:${secs.toString().padStart(2, '0')}`;
            } else if (timerId.includes('response') || timerId.includes('delayed')) {
                const minutes = Math.floor(remaining / 60);
                const secs = remaining % 60;
                timerElement.textContent = `Time: ${minutes}:${secs.toString().padStart(2, '0')}`;
                remaining++;
            } else {
                timerElement.textContent = `Time: ${remaining}`;
            }
            
            if (remaining === 0 && callback) {
                callback();
            } else if (remaining > 0) {
                remaining--;
            }
        }, 1000);
    }
    
    clearTimer(timerId) {
        if (this.timers[timerId]) {
            clearInterval(this.timers[timerId]);
            delete this.timers[timerId];
        }
    }
    
    clearAllDrawings() {
        this.currentDrawings.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
    }
    
    clearRecognition() {
        this.selectedFigures.clear();
        document.querySelectorAll('.recognition-figure').forEach(fig => {
            fig.classList.remove('selected');
        });
    }
    
    createSVG(figure) {
        const svgParts = {
            circle: `<circle cx="60" cy="60" r="40" fill="${figure.color}" />`,
            triangle: `<polygon points="60,20 100,80 20,80" fill="${figure.color}" />`,
            square: `<rect x="30" y="30" width="60" height="60" fill="${figure.color}" />`,
            diamond: `<polygon points="60,20 100,60 60,100 20,60" fill="${figure.color}" />`,
            star: `<polygon points="60,20 70,50 100,50 75,70 85,100 60,80 35,100 45,70 20,50 50,50" fill="${figure.color}" />`,
            cross: `<polygon points="60,20 70,50 100,50 75,70 85,100 60,80 35,100 45,70 20,50 50,50" fill="${figure.color}" />`,
            pentagon: `<polygon points="60,20 90,40 80,80 40,80 30,40" fill="${figure.color}" />`,
            hexagon: `<polygon points="60,20 90,40 90,80 60,100 30,80 30,40" fill="${figure.color}" />`,
            oval: `<ellipse cx="60" cy="60" rx="40" ry="25" fill="${figure.color}" />`,
            heart: `<path d="M60,80 C40,60 20,40 20,25 C20,10 30,5 40,5 C50,5 60,15 60,20 C60,15 70,5 80,5 C90,5 100,10 100,25 C100,40 80,60 60,80 Z" fill="${figure.color}" />`,
            arrow: `<polygon points="20,60 40,60 40,40 80,60 40,80 40,60" fill="${figure.color}" />`,
            moon: `<path d="M60,20 C40,20 25,35 25,55 C25,75 40,90 60,90 C50,85 45,75 45,55 C45,35 50,25 60,20 Z" fill="${figure.color}" />`
        };
        
        return `
            <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                ${svgParts[figure.type] || ''}
            </svg>
        `;
    }
    
    showMessage(message, type = 'info') {
        const messageArea = document.getElementById('message-area');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        messageArea.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
    
    resetTest() {
        this.currentPhase = 'intro';
        this.currentTrial = 0;
        this.learningScores = [];
        this.delayedScore = 0;
        this.recognitionScore = 0;
        this.currentDrawings = [];
        this.selectedFigures.clear();
        
        // Clear all timers
        Object.keys(this.timers).forEach(timerId => {
            this.clearTimer(timerId);
        });
        
        this.showPhase('intro-phase');
    }
    
    exportResults() {
        const totalLearning = this.learningScores.reduce((a, b) => a + b, 0);
        const avgLearning = (totalLearning / 3).toFixed(1);
        const learningSlope = this.calculateLearningSlope();
        const retentionRate = this.calculateRetentionRate();
        
        // Convert data to XML format
        function jsonToXml(data) {
            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += '<testResult>\n';
            
            // Add test metadata
            xml += `  <testName>${escapeXml(data.testName)}</testName>\n`;
            xml += `  <timestamp>${escapeXml(data.timestamp)}</timestamp>\n`;
            xml += `  <date>${escapeXml(data.date)}</date>\n`;
            
            // Add learning scores
            xml += '  <learningScores>\n';
            data.learningScores.forEach((score, index) => {
                xml += `    <trial id="${index + 1}">\n`;
                xml += `      <score>${escapeXml(score)}</score>\n`;
                xml += `      <maxScore>6</maxScore>\n`;
                xml += '    </trial>\n';
            });
            xml += '  </learningScores>\n';
            
            // Add summary scores
            xml += '  <summaryScores>\n';
            xml += `    <totalLearningScore>${escapeXml(data.totalLearningScore)}</totalLearningScore>\n`;
            xml += `    <maxTotalLearningScore>18</maxTotalLearningScore>\n`;
            xml += `    <averageLearningScore>${escapeXml(data.averageLearningScore)}</averageLearningScore>\n`;
            xml += `    <maxAverageLearningScore>6</maxAverageLearningScore>\n`;
            xml += `    <delayedRecallScore>${escapeXml(data.delayedRecallScore)}</delayedRecallScore>\n`;
            xml += `    <maxDelayedRecallScore>6</maxDelayedRecallScore>\n`;
            xml += `    <recognitionScore>${escapeXml(data.recognitionScore)}</recognitionScore>\n`;
            xml += `    <maxRecognitionScore>6</maxRecognitionScore>\n`;
            xml += `    <learningSlope>${escapeXml(data.learningSlope)}</learningSlope>\n`;
            xml += `    <retentionRate>${escapeXml(data.retentionRate)}</retentionRate>\n`;
            xml += '  </summaryScores>\n';
            
            // Add recognition details
            xml += '  <recognitionDetails>\n';
            xml += '    <selectedFigures>\n';
            data.selectedFigures.forEach(id => {
                xml += `      <figureId>${escapeXml(id)}</figureId>\n`;
            });
            xml += '    </selectedFigures>\n';
            xml += '    <correctSelections>\n';
            data.correctSelections.forEach(id => {
                xml += `      <figureId>${escapeXml(id)}</figureId>\n`;
            });
            xml += '    </correctSelections>\n';
            xml += '  </recognitionDetails>\n';
            
            xml += '</testResult>';
            return xml;
        }
        
        // Helper function to escape XML special characters
        function escapeXml(unsafe) {
            if (unsafe === null || unsafe === undefined) return '';
            return unsafe.toString()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        }
        
        // Prepare data for export
        const data = {
            testName: 'Brief Visuospatial Memory Test-Revised (BVMT-R)',
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleString(),
            learningScores: this.learningScores,
            totalLearningScore: totalLearning,
            averageLearningScore: avgLearning,
            delayedRecallScore: this.delayedScore,
            recognitionScore: this.recognitionScore,
            learningSlope: learningSlope,
            retentionRate: retentionRate,
            selectedFigures: Array.from(this.selectedFigures),
            correctSelections: this.stimulusFigures.filter(f => this.selectedFigures.has(f.id)).map(f => f.id)
        };
        
        // Generate XML and trigger download
        const xmlData = jsonToXml(data);
        const blob = new Blob([xmlData], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BVMT-R_Results_${new Date().toISOString().split('T')[0]}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showMessage('Results exported as XML file', 'success');
    }
}

// Global test instance
const test = new BVMTTest();

// Global functions for button onclick handlers
function startTest() {
    test.startTest();
}

function submitResponse() {
    test.submitResponse();
}

function submitDelayedResponse() {
    test.submitDelayedResponse();
}

function submitRecognition() {
    test.submitRecognition();
}

function clearAllDrawings() {
    test.clearAllDrawings();
}

function clearRecognition() {
    test.clearRecognition();
}

function skipDelay() {
    test.skipDelay();
}

function resetTest() {
    test.resetTest();
}

function exportResults() {
    test.exportResults();
}
