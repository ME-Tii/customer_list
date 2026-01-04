document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startBtn = document.getElementById('startBtn');
    const giveUpBtn = document.getElementById('giveUpBtn');
    const saveBtn = document.getElementById('saveBtn');
    const restartBtn = document.getElementById('restartBtn');
    const instructions = document.getElementById('instructions');
    const testArea = document.getElementById('testArea');
    const results = document.getElementById('results');
    const trailContainer = document.getElementById('trailContainer');
    const nextNumberEl = document.getElementById('nextNumber');
    const timerEl = document.getElementById('timer');
    const completionTimeEl = document.getElementById('completionTime');
    const errorCountEl = document.getElementById('errorCount');
    
    // Game state
    let gameState = {
        numbers: [],
        currentNumber: 1,
        startTime: null,
        timerInterval: null,
        errors: 0,
        lines: []
    };

    // Initialize the game
    function initGame() {
        // Reset game state
        gameState = {
            numbers: [],
            currentNumber: 1,
            startTime: null,
            timerInterval: null,
            errors: 0,
            lines: []
        };
        
        // Clear the container
        trailContainer.innerHTML = '';
        nextNumberEl.textContent = '1';
        
        // Grid layout parameters - 5x5 grid for 25 numbers
        const gridCols = 5;
        const gridRows = 5;
        const padding = 20; // Reduced padding for better space utilization
        
        // Set fixed container dimensions for consistent layout
        const containerWidth = 800; // Fixed width
        const containerHeight = 500; // Fixed height
        trailContainer.style.width = `${containerWidth}px`;
        trailContainer.style.height = `${containerHeight}px`;
        
        // Calculate cell dimensions
        const cellWidth = (containerWidth - (padding * 2)) / gridCols;
        const cellHeight = (containerHeight - (padding * 2)) / gridRows;
        
        // Create array of numbers 1-25 and shuffle
        const numbers = Array.from({length: 25}, (_, i) => i + 1);
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
        
        // Create and position all circles in a clean grid
        for (let i = 0; i < numbers.length; i++) {
            const row = Math.floor(i / gridCols);
            const col = i % gridCols;
            const number = numbers[i];
            
            // Calculate centered position within cell
            const x = padding + (col * cellWidth) + (cellWidth / 2) - 15; // Center in cell (15 = half of circle size)
            const y = padding + (row * cellHeight) + (cellHeight / 2) - 15; // Center in cell
            
            // Create circle element
            const circle = document.createElement('div');
            circle.className = 'circle';
            circle.textContent = number;
            circle.dataset.number = number;
            circle.style.left = `${x}px`;
            circle.style.top = `${y}px`;
            circle.style.zIndex = '10';
            
            // Store circle data
            gameState.numbers[number] = {
                element: circle,
                x: x + 25, // Center of the circle
                y: y + 25,
                number: number
            };
            
            // Add click handler
            circle.addEventListener('click', handleCircleClick);
            
            // Add to container
            trailContainer.appendChild(circle);
        }
    }
    
    // Handle circle click
    function handleCircleClick(e) {
        const clickedNumber = parseInt(e.target.dataset.number);
        
        // Check if this is the correct number
        if (clickedNumber === gameState.currentNumber) {
            // Mark as completed
            e.target.classList.add('completed');
            e.target.classList.remove('error');
            
            // Remove click handler to prevent multiple clicks
            e.target.removeEventListener('click', handleCircleClick);
            
            // If not the first number, draw a line from the previous number
            if (gameState.currentNumber > 1) {
                const prevCircle = gameState.numbers[gameState.currentNumber - 1];
                const currentCircle = gameState.numbers[gameState.currentNumber];
                
                if (prevCircle && currentCircle) {
                    drawLine(prevCircle, currentCircle);
                }
            }
            
            // Update game state
            gameState.currentNumber++;
            
            // Check if test is complete
            if (gameState.currentNumber > 25) {
                endTest(true); // Mark as completed
                return;
            }
            
            // Update next number display
            nextNumberEl.textContent = gameState.currentNumber;
            
        } else {
            // Wrong number - show error
            e.target.classList.add('error');
            gameState.errors++;
            
            // Remove error class after animation
            setTimeout(() => {
                e.target.classList.remove('error');
            }, 500);
        }
    }
    
    // Draw a line between two points
    function drawLine(from, to) {
        // Calculate distance and angle
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Create line element
        const line = document.createElement('div');
        line.className = 'line';
        line.style.width = `${length}px`;
        line.style.left = `${from.x}px`;
        line.style.top = `${from.y}px`;
        line.style.transform = `rotate(${angle}deg)`;
        
        // Add to container (behind circles)
        trailContainer.insertBefore(line, trailContainer.firstChild);
        
        // Store line reference
        gameState.lines.push(line);
    }
    
    // Start the test
    function startTest() {
        // Initialize game
        initGame();
        
        // Show test area
        instructions.style.display = 'none';
        testArea.style.display = 'block';
        results.style.display = 'none';
        
        // Start timer
        gameState.startTime = Date.now();
        gameState.timerInterval = setInterval(updateTimer, 100);
    }
    
    // Update the timer display
    function updateTimer() {
        const elapsed = (Date.now() - gameState.startTime) / 1000;
        timerEl.textContent = `${elapsed.toFixed(1)}s`;
    }
    
    // End the test
    function endTest(completed = false) {
        // Stop the timer
        clearInterval(gameState.timerInterval);
        
        // Calculate final time
        const endTime = Date.now();
        const timeElapsed = (endTime - gameState.startTime) / 1000;
        
        // Store completion status
        gameState.completed = completed;
        gameState.completedNumbers = gameState.currentNumber - 1;
        gameState.completionTime = timeElapsed;
        
        // Update results
        completionTimeEl.textContent = timeElapsed.toFixed(2);
        errorCountEl.textContent = gameState.errors;
        
        // Show results
        testArea.style.display = 'none';
        results.style.display = 'block';
        
        // Show completion status
        const statusElement = document.createElement('p');
        statusElement.textContent = completed ? 
            'Test completed successfully!' : 
            `Test aborted after completing ${gameState.completedNumbers} out of 25 numbers.`;
        statusElement.style.fontWeight = 'bold';
        statusElement.style.margin = '10px 0';
        statusElement.style.color = completed ? '#2ecc71' : '#e74c3c';
        results.insertBefore(statusElement, results.firstChild);
    }
    
    // Save results as XML
    function saveResults() {
        const data = {
            test: 'Trail Making Test - Part A',
            completed: gameState.completed,
            numbersCompleted: gameState.completedNumbers,
            totalNumbers: 25,
            completionTime: gameState.completionTime,
            errors: gameState.errors,
            date: new Date().toISOString(),
            timestamp: new Date().toLocaleString(),
            completionStatus: gameState.completed ? 'Completed' : 'Incomplete'
        };
        
        // Convert to XML
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testResult>
    <testName>${escapeXml(data.test)}</testName>
    <completionStatus>${escapeXml(data.completionStatus)}</completionStatus>
    <numbersCompleted>${data.numbersCompleted}</numbersCompleted>
    <totalNumbers>${data.totalNumbers}</totalNumbers>
    <completionTime>${data.completionTime.toFixed(2)}</completionTime>
    <errors>${data.errors}</errors>
    <date>${escapeXml(data.date)}</date>
    <timestamp>${escapeXml(data.timestamp)}</timestamp>
</testResult>`;

        // Create and trigger download
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trail_making_a_${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show success message
        alert('Results saved successfully!');
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
    
    // Event Listeners
    startBtn.addEventListener('click', startTest);
    giveUpBtn.addEventListener('click', () => endTest(false)); // Mark as not completed
    saveBtn.addEventListener('click', saveResults);
    restartBtn.addEventListener('click', () => {
        results.style.display = 'none';
        instructions.style.display = 'block';
    });
});
