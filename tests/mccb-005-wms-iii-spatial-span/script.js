document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startTestBtn = document.getElementById('startForwardBtn');
    const endTestBtn = document.getElementById('endTestBtn');
    const saveResultsBtn = document.getElementById('saveResultsBtn');
    const restartBtn = document.getElementById('restartBtn');
    const instructions = document.getElementById('instructions');
    const testArea = document.getElementById('testArea');
    const results = document.getElementById('results');
    const grid = document.getElementById('grid');
    const feedback = document.getElementById('feedback');
    const testTypeEl = document.getElementById('testType');
    const sequenceLengthEl = document.getElementById('sequenceLength');
    const trialsRemainingEl = document.getElementById('trialsRemaining');
    const scoreEl = document.getElementById('forwardScore');
    const maxSpanEl = document.getElementById('forwardMaxSpan');
    const savedMessage = document.getElementById('savedMessage');

    // WMS-III Spatial Span Forward Test Configuration
    const config = {
        minSequenceLength: 2,   // Start with 2 blocks
        maxSequenceLength: 9,   // Maximum sequence length (can be adjusted)
        maxAttemptsPerLength: 2, // 2 trials per sequence length
        cellCount: 25,          // 5x5 grid (25 blocks)
        showTime: 1000,         // 1 second per block display
        betweenTime: 500,       // 0.5 seconds between blocks
        feedbackTime: 1000      // 1 second feedback
    };

    // Test state for WMS-III Spatial Span
    let testState = {
        sequenceLength: config.minSequenceLength, // Current sequence length
        currentTrial: 1,        // Current trial (1 or 2)
        consecutiveFailures: 0,  // Number of consecutive failures at current length
        isRunning: false,       // Whether test is in progress
        sequence: [],           // Current sequence to remember
        userSequence: [],       // User's response sequence
        spanScores: [],         // Track scores for each sequence length
        maxSpan: 0,             // Maximum span achieved
        testStartTime: null,    // When the test started
        testEndTime: null,      // When the test ended
        responses: []           // Detailed response data
    };

    // Initialize the grid
    function initializeGrid() {
        grid.innerHTML = '';
        for (let i = 0; i < config.cellCount; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.index = i;
            cell.addEventListener('click', handleCellClick);
            grid.appendChild(cell);
        }
    }

    // Start the test
    function startTest() {
        // Reset test state
        testState = {
            sequenceLength: config.minSequenceLength,
            currentTrial: 1,
            consecutiveFailures: 0,
            isRunning: true,
            sequence: [],
            userSequence: [],
            spanScores: [],
            maxSpan: 0,
            testStartTime: new Date(),
            testEndTime: null,
            responses: []
        };
        
        // Update UI
        instructions.style.display = 'none';
        testArea.style.display = 'block';
        results.style.display = 'none';
        
        // Start the first trial
        startTrial();
    }

    // Start a new trial
    function startTrial() {
        console.log(`Starting trial ${testState.currentTrial} of length ${testState.sequenceLength}`);
        
        // Reset user sequence
        testState.userSequence = [];
        
        // Generate a new random sequence
        testState.sequence = [];
        const indices = Array.from({length: config.cellCount}, (_, i) => i);
        
        // Create a sequence of the current length
        for (let i = 0; i < testState.sequenceLength; i++) {
            const randomIndex = Math.floor(Math.random() * indices.length);
            testState.sequence.push(indices.splice(randomIndex, 1)[0]);
        }
        
        console.log(`Sequence (length ${testState.sequenceLength}):`, testState.sequence);
        
        // Update UI
        testTypeEl.textContent = 'Forward Span';
        sequenceLengthEl.textContent = testState.sequenceLength;
        trialsRemainingEl.textContent = `${testState.currentTrial} of ${config.maxAttemptsPerLength}`;
        
        // Show the sequence to the user
        showSequence();
    }

    // Show the sequence to the user
    async function showSequence() {
        // Disable grid during sequence display
        grid.style.pointerEvents = 'none';
        feedback.textContent = 'Watch the sequence...';
        
        // Show each cell in the sequence
        for (let i = 0; i < testState.sequence.length; i++) {
            const cellIndex = testState.sequence[i];
            const cell = grid.children[cellIndex];
            
            // Highlight the cell
            cell.classList.add('active');
            
            // Wait for the specified time
            await new Promise(resolve => setTimeout(resolve, config.showTime));
            
            // Remove highlight
            cell.classList.remove('active');
            
            // Add a small delay between cells
            if (i < testState.sequence.length - 1) {
                await new Promise(resolve => setTimeout(resolve, config.betweenTime));
            }
        }
        
        // Enable grid for user response
        feedback.textContent = 'Click the squares in the same order';
        grid.style.pointerEvents = 'auto';
    }

    // Handle cell click during user response
    function handleCellClick(e) {
        if (!testState.isRunning) return;
        
        const cellIndex = parseInt(e.target.dataset.index);
        
        // Add to user sequence
        testState.userSequence.push(cellIndex);
        
        // Visual feedback
        e.target.classList.add('active');
        setTimeout(() => {
            e.target.classList.remove('active');
        }, 300);
        
        // Check if the sequence is complete
        if (testState.userSequence.length === testState.sequence.length) {
            // Check if the sequence is correct
            const expectedSequence = [...testState.sequence];
            const isCorrect = testState.userSequence.length === expectedSequence.length &&
                            testState.userSequence.every((value, index) => value === expectedSequence[index]);
            
            // Save the response
            const response = {
                sequenceLength: testState.sequenceLength,
                trial: testState.currentTrial,
                sequence: [...testState.sequence],
                userSequence: [...testState.userSequence],
                correct: isCorrect,
                timestamp: new Date().toISOString()
            };
            testState.responses.push(response);
            
            // Update UI feedback
            if (isCorrect) {
                feedback.textContent = 'Correct!';
                feedback.className = 'feedback correct';
                
                // Update max span if this is a new record
                if (testState.sequenceLength > testState.maxSpan) {
                    testState.maxSpan = testState.sequenceLength;
                }
                
                // Add to span scores if not already present
                const scoreIndex = testState.sequenceLength - config.minSequenceLength;
                if (!testState.spanScores[scoreIndex]) {
                    testState.spanScores[scoreIndex] = {
                        length: testState.sequenceLength,
                        correct: 1,
                        attempts: 1
                    };
                } else {
                    testState.spanScores[scoreIndex].correct++;
                    testState.spanScores[scoreIndex].attempts++;
                }
                
                // Reset consecutive failures
                testState.consecutiveFailures = 0;
                
                // Move to next sequence length
                testState.sequenceLength++;
                testState.currentTrial = 1;
                
                console.log(`Correct! Moving to sequence length ${testState.sequenceLength}`);
                
            } else {
                feedback.textContent = 'Incorrect';
                feedback.className = 'feedback incorrect';
                
                // Update span scores
                const scoreIndex = testState.sequenceLength - config.minSequenceLength;
                if (!testState.spanScores[scoreIndex]) {
                    testState.spanScores[scoreIndex] = {
                        length: testState.sequenceLength,
                        correct: 0,
                        attempts: 1
                    };
                } else {
                    testState.spanScores[scoreIndex].attempts++;
                }
                
                // Increment consecutive failures
                testState.consecutiveFailures++;
                
                // Move to next trial or end test
                if (testState.currentTrial < config.maxAttemptsPerLength) {
                    testState.currentTrial++;
                    console.log(`Incorrect. Trying trial ${testState.currentTrial} of ${config.maxAttemptsPerLength}`);
                } else {
                    // If we've had 2 consecutive failures at the same length, end test
                    if (testState.consecutiveFailures >= 2) {
                        console.log(`Test complete. Maximum span: ${testState.maxSpan}`);
                        setTimeout(() => endTest(), config.feedbackTime);
                        return;
                    }
                    
                    // Otherwise, reset trials and try next length
                    testState.currentTrial = 1;
                    testState.sequenceLength++;
                    console.log(`Moving to sequence length ${testState.sequenceLength}`);
                }
            }
            
            // Start next trial or end test
            if (testState.sequenceLength <= config.maxSequenceLength) {
                setTimeout(() => {
                    feedback.className = 'feedback';
                    startTrial();
                }, config.feedbackTime);
            } else {
                console.log('Test complete - reached maximum sequence length');
                setTimeout(() => endTest(), config.feedbackTime);
            }
        }
    }

    
    restartBtn.addEventListener('click', () => {
        testArea.style.display = 'none';
        results.style.display = 'none';
        instructions.style.display = 'block';
        document.getElementById('forward-instructions').style.display = 'block';
        document.getElementById('backward-instructions').style.display = 'none';
    });

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

    // End the test
    function endTest() {
        testState.isRunning = false;
        testState.testEndTime = new Date();
        
        // Calculate the span score (maximum length with at least one correct response)
        let spanScore = 0;
        for (let i = 0; i < testState.spanScores.length; i++) {
            if (testState.spanScores[i] && testState.spanScores[i].correct > 0) {
                spanScore = testState.spanScores[i].length;
            } else {
                break; // Stop at first length with no correct responses
            }
        }
        
        // Update UI with results
        scoreEl.textContent = spanScore;
        maxSpanEl.textContent = testState.maxSpan;
        
        // Show results
        testArea.style.display = 'none';
        results.style.display = 'block';
        
        console.log('Test completed. Max span:', testState.maxSpan, 'Span score:', spanScore);
    }
    
    // Enable grid for user response
    feedback.textContent = 'Click the squares in the same order';
    grid.style.pointerEvents = 'auto';

    // Save results as XML
    function saveResults() {
        const testDuration = (testState.testEndTime - testState.testStartTime) / 1000; // in seconds
        const spanScore = testState.maxSpan;
        
        // Convert data to XML format
        function jsonToXml(data) {
            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += '<testResult>\n';
            
            // Add test metadata
            xml += `  <testName>${escapeXml(data.test)}</testName>\n`;
            xml += `  <timestamp>${escapeXml(data.timestamp)}</timestamp>\n`;
            xml += `  <date>${escapeXml(data.date)}</date>\n`;
            xml += `  <testDuration>${escapeXml(data.testDuration)}</testDuration>\n`;
            xml += `  <score>${escapeXml(data.score)}</score>\n`;
            xml += `  <maxSpan>${escapeXml(data.maxSpan)}</maxSpan>\n`;
            
            // Add test configuration
            xml += '  <testConfiguration>\n';
            xml += `    <maxSequenceLength>${escapeXml(data.testConfiguration.maxSequenceLength)}</maxSequenceLength>\n`;
            xml += `    <maxAttemptsPerLength>${escapeXml(data.testConfiguration.maxAttemptsPerLength)}</maxAttemptsPerLength>\n`;
            xml += '  </testConfiguration>\n';
            
            // Add responses
            xml += '  <responses>\n';
            data.responses.forEach((response, index) => {
                xml += `    <response id="${index + 1}">\n`;
                xml += `      <sequenceLength>${escapeXml(response.sequenceLength)}</sequenceLength>\n`;
                xml += `      <trial>${escapeXml(response.trial)}</trial>\n`;
                xml += `      <correct>${escapeXml(response.correct)}</correct>\n`;
                xml += `      <timestamp>${escapeXml(response.timestamp)}</timestamp>\n`;
                
                // Add sequence
                xml += '      <sequence>\n';
                response.sequence.forEach((pos, seqIndex) => {
                    xml += `        <position index="${seqIndex + 1}">${escapeXml(pos)}</position>\n`;
                });
                xml += '      </sequence>\n';
                
                // Add user sequence
                xml += '      <userSequence>\n';
                response.userSequence.forEach((pos, userIndex) => {
                    xml += `        <position index="${userIndex + 1}">${escapeXml(pos)}</position>\n`;
                });
                xml += '      </userSequence>\n';
                
                xml += '    </response>\n';
            });
            xml += '  </responses>\n';
            
            xml += '</testResult>';
            return xml;
        }
        
        // Prepare data for export
        const data = {
            test: 'WMS-III: Spatial Span Forward',
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleString(),
            testDuration: testDuration,
            score: spanScore,
            maxSpan: testState.maxSpan,
            testConfiguration: {
                maxSequenceLength: config.maxSequenceLength,
                maxAttemptsPerLength: config.maxAttemptsPerLength
            },
            responses: testState.responses
        };
        
        // Generate XML and trigger download
        const xmlData = jsonToXml(data);
        const blob = new Blob([xmlData], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wms_iii_spatial_span_${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show saved message
        savedMessage.style.display = 'block';
        setTimeout(() => {
            savedMessage.style.display = 'none';
        }, 3000);
    }

    // Add event listeners
    startTestBtn.addEventListener('click', startTest);
    endTestBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to end the test early?')) {
            endTest();
        }
    });
    saveResultsBtn.addEventListener('click', saveResults);
    
    // Hide backward test elements in the UI
    document.querySelectorAll('.backward-test').forEach(el => el.style.display = 'none');

    // Initialize the grid when the page loads
    initializeGrid();
});
