document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startBtn = document.getElementById('startBtn');
    const respondBtn = document.getElementById('respondBtn');
    const skipStageBtn = document.getElementById('skipStageBtn');
    const endTestBtn = document.getElementById('endTestBtn');
    const saveResultsBtn = document.getElementById('saveResultsBtn');
    const restartBtn = document.getElementById('restartBtn');
    const instructions = document.getElementById('instructions');
    const testArea = document.getElementById('testArea');
    const results = document.getElementById('results');
    const stimulus = document.getElementById('stimulus');
    const timerEl = document.getElementById('timer');
    const correctCountEl = document.getElementById('correctCount');
    const incorrectCountEl = document.getElementById('incorrectCount');
    const missedCountEl = document.getElementById('missedCount');
    const completionStatusEl = document.getElementById('completionStatus');
    const totalTimeEl = document.getElementById('totalTime');
    const finalCorrectEl = document.getElementById('finalCorrect');
    const finalIncorrectEl = document.getElementById('finalIncorrect');
    const finalMissedEl = document.getElementById('finalMissed');
    const avgResponseTimeEl = document.getElementById('avgResponseTime');
    const hitRateEl = document.getElementById('hitRate');
    const falseAlarmRateEl = document.getElementById('falseAlarmRate');
    const missRateEl = document.getElementById('missRate');
    const totalErrorRateEl = document.getElementById('totalErrorRate');

    // Test configuration
    const config = {
        stages: [
            { digits: 2, stimuliCount: 150 },
            { digits: 3, stimuliCount: 150 },
            { digits: 4, stimuliCount: 150 }
        ],
        minStimulusDuration: 1000, // 1 second
        maxStimulusDuration: 1500, // 1.5 seconds
        minInterval: 1500, // 1.5 seconds between stimuli
        maxInterval: 2500, // 2.5 seconds between stimuli
        targetProbability: 0.3 // 30% chance of a target pair
    };

    // Test state
    let gameState = {
        isRunning: false,
        startTime: null,
        timerInterval: null,
        currentStage: 0,
        currentStimulus: null,
        previousStimulus: null,
        isTarget: false,
        responseTime: null,
        responseStartTime: null,
        correctCount: 0,
        incorrectCount: 0,
        missedCount: 0,
        falseAlarmCount: 0,
        responseTimes: [],
        testCompleted: false,
        testAborted: false,
        stimuliHistory: [],
        stimuliPresented: 0,
        stageStartTime: null,
        stageHistory: [],
        totalTargetsPresented: 0,
        totalNonTargetsPresented: 0
    };

    // Generate a random number with specified number of digits
    function generateRandomNumber(digits) {
        const min = Math.pow(10, digits - 1);
        const max = Math.pow(10, digits) - 1;
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Initialize the test
    function initTest() {
        // Reset game state
        gameState = {
            isRunning: true,
            startTime: null,
            timerInterval: null,
            currentStage: 0,
            currentStimulus: null,
            previousStimulus: null,
            isTarget: false,
            responseTime: null,
            responseStartTime: null,
            correctCount: 0,
            incorrectCount: 0,
            missedCount: 0,
            falseAlarmCount: 0,
            responseTimes: [],
            testCompleted: false,
            testAborted: false,
            stimuliHistory: [],
            stimuliPresented: 0,
            stageStartTime: null,
            stageHistory: [],
            totalTargetsPresented: 0,
            totalNonTargetsPresented: 0
        };

        // Update UI
        correctCountEl.textContent = '0';
        incorrectCountEl.textContent = '0';
        missedCountEl.textContent = '0';
        timerEl.textContent = '0.0';
        stimulus.textContent = '';
        stimulus.className = 'stimulus';

        // Show test area and hide instructions/results
        instructions.style.display = 'none';
        results.style.display = 'none';
        testArea.style.display = 'block';
        
        // Update progress display
        updateProgressDisplay();

        // Start the test
        startTest();
    }
    
    // Update the stage and progress display
    function updateProgressDisplay() {
        const currentStage = config.stages[gameState.currentStage];
        const stageDisplay = document.getElementById('stageDisplay');
        const stageProgress = document.getElementById('stageProgress');
        const stimuliProgress = document.getElementById('stimuliProgress');
        
        if (stageDisplay) {
            stageDisplay.textContent = `Stage ${gameState.currentStage + 1} of ${config.stages.length} (${currentStage.digits}-digit numbers)`;
        }
        
        if (stageProgress) {
            stageProgress.textContent = `Stage ${gameState.currentStage + 1} of ${config.stages.length}`;
        }
        
        if (stimuliProgress) {
            stimuliProgress.textContent = `Stimulus ${gameState.stimuliPresented + 1} of ${currentStage.stimuliCount}`;
        }
    }

    // Start the test
    function startTest() {
        // Set start time
        gameState.startTime = Date.now();
        gameState.stageStartTime = Date.now();
        
        // Start timer
        gameState.timerInterval = setInterval(updateTimer, 100);
        
        // Start presenting stimuli
        presentStimulus();
    }

    // Present a new stimulus
    function presentStimulus() {
        if (!gameState.isRunning) return;
        
        // Check if we've completed the current stage
        if (gameState.stimuliPresented >= config.stages[gameState.currentStage].stimuliCount) {
            // Record stage completion
            const stageEndTime = Date.now();
            const stageDuration = (stageEndTime - gameState.stageStartTime) / 1000;
            
            // Save stage history
            gameState.stageHistory.push({
                stage: gameState.currentStage + 1,
                digits: config.stages[gameState.currentStage].digits,
                startTime: new Date(gameState.stageStartTime).toISOString(),
                endTime: new Date(stageEndTime).toISOString(),
                duration: stageDuration,
                correct: gameState.correctCount,
                incorrect: gameState.incorrectCount,
                missed: gameState.missedCount,
                skipped: false
            });
            
            // Move to next stage or end test
            gameState.currentStage++;
            if (gameState.currentStage >= config.stages.length) {
                endTest(true);
                return;
            }
            
            // Reset for next stage
            gameState.stimuliPresented = 0;
            gameState.stageStartTime = Date.now();
            gameState.previousStimulus = null;
            gameState.currentStimulus = null;
            gameState.isTarget = false;
            
            // Update stage display
            updateStageDisplay();
            
            // Add a small delay before starting next stage
            gameState.stimulusTimeout = setTimeout(presentStimulus, 1000);
            return;
        }

        // Determine if this will be a target (same as previous)
        const isTarget = Math.random() < config.targetProbability && 
                        gameState.previousStimulus !== null &&
                        !gameState.isTarget; // Prevent more than 2 in a row

        // Set the current stimulus
        gameState.previousStimulus = gameState.currentStimulus;
        const currentDigits = config.stages[gameState.currentStage].digits;
        
        if (isTarget) {
            // If it's a target, use the same number as before
            gameState.currentStimulus = gameState.previousStimulus;
            gameState.isTarget = true;
            gameState.responseStartTime = Date.now();
            gameState.totalTargetsPresented++;
        } else {
            // Otherwise, generate a new random number with the correct number of digits
            let nextNumber;
            do {
                nextNumber = generateRandomNumber(currentDigits);
            } while (nextNumber === gameState.previousStimulus);
            
            gameState.currentStimulus = nextNumber;
            gameState.isTarget = false;
            gameState.totalNonTargetsPresented++;
        }

        // Record stimulus presentation
        const stimulusData = {
            timestamp: Date.now() - gameState.startTime,
            stage: gameState.currentStage + 1,
            stageDigits: config.stages[gameState.currentStage].digits,
            stimulus: gameState.currentStimulus,
            isTarget: gameState.isTarget,
            response: null,
            responseTime: null
        };
        
        gameState.stimuliHistory.push(stimulusData);
        gameState.stimuliPresented++;
        
        // Update the display
        stimulus.textContent = gameState.currentStimulus;
        
        // Update progress display after each stimulus
        updateProgressDisplay();
        
        // Set the stimulus duration
        const stimulusDuration = gameState.isTarget ? 
            config.minStimulusDuration : 
            Math.random() * (config.maxStimulusDuration - config.minStimulusDuration) + config.minStimulusDuration;
        
        // Schedule the next stimulus
        const interval = Math.random() * (config.maxInterval - config.minInterval) + config.minInterval;
        
        // Clear the stimulus after the duration
        gameState.stimulusTimeout = setTimeout(() => {
            // If this was a target and wasn't responded to, count as missed
            if (gameState.isTarget && gameState.responseStartTime) {
                gameState.missedCount++;
                gameState.incorrectCount++; // Add to total errors
                missedCountEl.textContent = gameState.missedCount;
                incorrectCountEl.textContent = gameState.incorrectCount; // Update total errors display
                
                // Update the stimulus data
                const lastStimulus = gameState.stimuliHistory[gameState.stimuliHistory.length - 1];
                if (lastStimulus) {
                    lastStimulus.response = 'missed';
                }
                
                // Visual feedback for missed target
                stimulus.classList.add('missed');
                setTimeout(() => stimulus.classList.remove('missed'), 200);
            }
            
            // Clear the stimulus
            stimulus.textContent = '';
            
            // Present next stimulus after interval
            if (gameState.isRunning) {
                gameState.stimulusTimeout = setTimeout(presentStimulus, interval - stimulusDuration);
            }
        }, stimulusDuration);
    }

    // Handle response
    function handleResponse() {
        if (!gameState.isRunning) return;
        
        // Calculate response time (use current time as base for non-targets)
        const responseTime = gameState.responseStartTime ? 
            Date.now() - gameState.responseStartTime : 
            0; // Non-targets have no meaningful response time
        
        if (gameState.isTarget && gameState.responseStartTime !== null) {
            // This is a response to a target that hasn't been responded to yet
            const lastStimulus = gameState.stimuliHistory[gameState.stimuliHistory.length - 1];
            if (lastStimulus && lastStimulus.response === null) {
                lastStimulus.response = 'correct';
                lastStimulus.responseTime = responseTime;
            }
            
            // Correct response to target
            gameState.correctCount++;
            correctCountEl.textContent = gameState.correctCount;
            gameState.responseTimes.push(responseTime);
            
            // Visual feedback
            stimulus.classList.add('correct');
            setTimeout(() => stimulus.classList.remove('correct'), 200);
            
            // Reset response tracking for targets (prevent multiple correct responses)
            gameState.responseStartTime = null;
        } else if (!gameState.isTarget) {
            // This is a false alarm (response to non-target)
            
            // Count as false alarm
            gameState.falseAlarmCount++;
            gameState.incorrectCount++; // Add to total errors
            incorrectCountEl.textContent = gameState.incorrectCount; // Update total errors display
            
            // Record the false alarm if this is the first response to this stimulus
            const lastStimulus = gameState.stimuliHistory[gameState.stimuliHistory.length - 1];
            if (lastStimulus && lastStimulus.response === null) {
                lastStimulus.response = 'incorrect';
                lastStimulus.responseTime = responseTime;
            }
            
            // Visual feedback
            stimulus.classList.add('incorrect');
            setTimeout(() => stimulus.classList.remove('incorrect'), 200);
        }
        // If gameState.isTarget is true but responseStartTime is null, 
        // this means the target was already correctly responded to, so ignore additional presses
    }

    // Update the timer
    function updateTimer() {
        if (!gameState.startTime) return;
        const elapsed = (Date.now() - gameState.startTime) / 1000;
        timerEl.textContent = elapsed.toFixed(1);
    }

    // End the test
    function endTest(completed = false) {
        if (!gameState.isRunning) return;
        
        // Stop the test
        gameState.isRunning = false;
        gameState.testCompleted = completed;
        gameState.testAborted = !completed;
        
        // Clear intervals and timeouts
        clearInterval(gameState.timerInterval);
        if (gameState.stimulusTimeout) {
            clearTimeout(gameState.stimulusTimeout);
            gameState.stimulusTimeout = null;
        }
        
        // Calculate final stats
        const totalTime = (Date.now() - gameState.startTime) / 1000;
        const avgResponseTime = gameState.responseTimes.length > 0 ?
            Math.round(gameState.responseTimes.reduce((a, b) => a + b, 0) / gameState.responseTimes.length) : 0;
        
        // Calculate error rates and additional metrics
        const totalTargets = gameState.totalTargetsPresented;
        const totalNonTargets = gameState.totalNonTargetsPresented;
        const totalStimuli = totalTargets + totalNonTargets;
        
        // Error rates
        const hitRate = totalTargets > 0 ? (gameState.correctCount / totalTargets) * 100 : 0;
        const falseAlarmRate = totalNonTargets > 0 ? (gameState.falseAlarmCount / totalNonTargets) * 100 : 0;
        const missRate = totalTargets > 0 ? (gameState.missedCount / totalTargets) * 100 : 0;
        
        // Overall error rate (incorrectCount now includes all errors)
        const totalErrors = gameState.incorrectCount; // This now includes false alarms + missed
        const totalErrorRate = totalStimuli > 0 ? (totalErrors / totalStimuli) * 100 : 0;
        
        // Signal detection metrics
        const sensitivity = totalTargets > 0 ? (gameState.correctCount / totalTargets) : 0;
        const falseAlarmRatio = totalNonTargets > 0 ? (gameState.falseAlarmCount / totalNonTargets) : 0;
        
        // Update results display
        totalTimeEl.textContent = totalTime.toFixed(1);
        finalCorrectEl.textContent = gameState.correctCount;
        finalIncorrectEl.textContent = gameState.incorrectCount;
        finalMissedEl.textContent = gameState.missedCount;
        avgResponseTimeEl.textContent = avgResponseTime;
        hitRateEl.textContent = hitRate.toFixed(1);
        falseAlarmRateEl.textContent = falseAlarmRate.toFixed(1);
        missRateEl.textContent = missRate.toFixed(1);
        totalErrorRateEl.textContent = totalErrorRate.toFixed(1);
        
        // Set completion status
        if (completed) {
            completionStatusEl.textContent = 'Test completed successfully!';
            completionStatusEl.className = 'status completed';
        } else {
            completionStatusEl.textContent = 'Test was aborted.';
            completionStatusEl.className = 'status incomplete';
        }
        
        // Show results
        testArea.style.display = 'none';
        results.style.display = 'block';
    }

    // Save results as XML
    function saveResults() {
        // Calculate additional metrics
        const totalStimuli = gameState.stimuliHistory.length;
        const totalTargets = gameState.totalTargetsPresented;
        const totalNonTargets = gameState.totalNonTargetsPresented;
        const totalResponses = gameState.correctCount + gameState.incorrectCount;
        const accuracy = totalTargets > 0 ? (gameState.correctCount / totalTargets) * 100 : 0;
        const avgResponseTime = gameState.responseTimes.length > 0 ?
            gameState.responseTimes.reduce((a, b) => a + b, 0) / gameState.responseTimes.length : 0;
        
        // Error rates
        const hitRate = totalTargets > 0 ? (gameState.correctCount / totalTargets) * 100 : 0;
        const falseAlarmRate = totalNonTargets > 0 ? (gameState.falseAlarmCount / totalNonTargets) * 100 : 0;
        const missRate = totalTargets > 0 ? (gameState.missedCount / totalTargets) * 100 : 0;
        const totalErrors = gameState.incorrectCount; // This now includes all errors
        const totalErrorRate = totalStimuli > 0 ? (totalErrors / totalStimuli) * 100 : 0;
            
        // Calculate stage-wise metrics
        const stageMetrics = config.stages.map((stage, index) => {
            const stageStimuli = gameState.stimuliHistory.filter(s => s.stage === index + 1);
            const stageTargets = stageStimuli.filter(s => s.isTarget).length;
            const stageCorrect = stageStimuli.filter(s => s.response === 'correct').length;
            const stageIncorrect = stageStimuli.filter(s => s.response === 'incorrect').length;
            const stageMissed = stageStimuli.filter(s => s.isTarget && s.response === 'missed').length;
            const stageAccuracy = stageTargets > 0 ? (stageCorrect / stageTargets) * 100 : 0;
            
            return {
                stage: index + 1,
                digits: stage.digits,
                stimuli: stageStimuli.length,
                targets: stageTargets,
                correct: stageCorrect,
                incorrect: stageIncorrect,
                missed: stageMissed,
                accuracy: stageAccuracy
            };
        });
        
        // Prepare data for XML
        const data = {
            test: 'Continuous Performance Test - Identical Pairs (CPT-IP)',
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleString(),
            testDuration: (Date.now() - gameState.startTime) / 1000,
            completed: gameState.testCompleted,
            aborted: gameState.testAborted,
            totalStimuli: totalStimuli,
            totalTargets: totalTargets,
            totalNonTargets: totalNonTargets,
            totalResponses: totalResponses,
            correctResponses: gameState.correctCount,
            incorrectResponses: gameState.falseAlarmCount,
            missedTargets: gameState.missedCount,
            totalErrors: totalErrors,
            accuracy: accuracy.toFixed(2) + '%',
            hitRate: hitRate.toFixed(2) + '%',
            falseAlarmRate: falseAlarmRate.toFixed(2) + '%',
            missRate: missRate.toFixed(2) + '%',
            totalErrorRate: totalErrorRate.toFixed(2) + '%',
            averageResponseTime: avgResponseTime.toFixed(2) + 'ms',
            stages: stageMetrics,
            stageHistory: gameState.stageHistory,
            stimuliHistory: gameState.stimuliHistory
        };
        
        // Convert to XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<CPTIPResult>\n`;
        
        // Add metadata
        xml += `  <metadata>\n`;
        xml += `    <testName>${escapeXml(data.test)}</testName>\n`;
        xml += `    <timestamp>${escapeXml(data.timestamp)}</timestamp>\n`;
        xml += `    <date>${escapeXml(data.date)}</date>\n`;
        xml += `    <testDuration>${data.testDuration.toFixed(2)}</testDuration>\n`;
        xml += `    <completed>${data.completed}</completed>\n`;
        xml += `    <aborted>${data.aborted}</aborted>\n`;
        xml += `  </metadata>\n`;
        
        // Add summary
        xml += `  <summary>\n`;
        xml += `    <totalStimuli>${data.totalStimuli}</totalStimuli>\n`;
        xml += `    <totalTargets>${data.totalTargets}</totalTargets>\n`;
        xml += `    <totalNonTargets>${data.totalNonTargets}</totalNonTargets>\n`;
        xml += `    <totalResponses>${data.totalResponses}</totalResponses>\n`;
        xml += `    <correctResponses>${data.correctResponses}</correctResponses>\n`;
        xml += `    <incorrectResponses>${data.incorrectResponses}</incorrectResponses>\n`;
        xml += `    <missedTargets>${data.missedTargets}</missedTargets>\n`;
        xml += `    <totalErrors>${data.totalErrors}</totalErrors>\n`;
        xml += `    <accuracy>${data.accuracy}</accuracy>\n`;
        xml += `    <hitRate>${data.hitRate}</hitRate>\n`;
        xml += `    <falseAlarmRate>${data.falseAlarmRate}</falseAlarmRate>\n`;
        xml += `    <missRate>${data.missRate}</missRate>\n`;
        xml += `    <totalErrorRate>${data.totalErrorRate}</totalErrorRate>\n`;
        xml += `    <averageResponseTime>${data.averageResponseTime}</averageResponseTime>\n`;
        xml += `  </summary>\n`;
        
        // Add stage summaries
        xml += `  <stageSummaries>\n`;
        data.stages.forEach(stage => {
            xml += `    <stage>\n`;
            xml += `      <number>${stage.stage}</number>\n`;
            xml += `      <digits>${stage.digits}</digits>\n`;
            xml += `      <stimuli>${stage.stimuli}</stimuli>\n`;
            xml += `      <targets>${stage.targets}</targets>\n`;
            xml += `      <correct>${stage.correct}</correct>\n`;
            xml += `      <incorrect>${stage.incorrect}</incorrect>\n`;
            xml += `      <missed>${stage.missed}</missed>\n`;
            xml += `      <accuracy>${stage.accuracy.toFixed(2)}%</accuracy>\n`;
            xml += `    </stage>\n`;
        });
        xml += `  </stageSummaries>\n`;
        
        // Add detailed stimuli history
        xml += `  <stimuliHistory>\n`;
        data.stimuliHistory.forEach((stimulus, index) => {
            xml += `    <stimulus>\n`;
            xml += `      <index>${index + 1}</index>\n`;
            xml += `      <stage>${stimulus.stage}</stage>\n`;
            xml += `      <digits>${stimulus.stageDigits}</digits>\n`;
            xml += `      <timestamp>${stimulus.timestamp}</timestamp>\n`;
            xml += `      <value>${stimulus.stimulus}</value>\n`;
            xml += `      <isTarget>${stimulus.isTarget}</isTarget>\n`;
            xml += `      <response>${stimulus.response || 'no response'}</response>\n`;
            if (stimulus.responseTime !== null && stimulus.responseTime !== undefined) {
                xml += `      <responseTime>${stimulus.responseTime}</responseTime>\n`;
            }
            xml += `    </stimulus>\n`;
        });
        xml += `  </stimuliHistory>\n`;
        
        xml += `</CPTIPResult>`;
        
        // Create and trigger download
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cpt_ip_results_${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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

    // Function to move to next stage
    function moveToNextStage() {
        // Record stage completion
        const stageEndTime = Date.now();
        const stageDuration = (stageEndTime - gameState.stageStartTime) / 1000;
        
        // Save stage history
        gameState.stageHistory.push({
            stage: gameState.currentStage + 1,
            digits: config.stages[gameState.currentStage].digits,
            startTime: new Date(gameState.stageStartTime).toISOString(),
            endTime: new Date(stageEndTime).toISOString(),
            duration: stageDuration,
            correct: gameState.correctCount,
            incorrect: gameState.incorrectCount,
            missed: gameState.missedCount,
            skipped: true
        });
        
        // Move to next stage or end test
        gameState.currentStage++;
        if (gameState.currentStage >= config.stages.length) {
            endTest(true);
            return;
        }
        
        // Reset for next stage
        gameState.stimuliPresented = 0;
        gameState.stageStartTime = Date.now();
        gameState.previousStimulus = null;
        gameState.currentStimulus = null;
        gameState.isTarget = false;
        
        // Clear any ongoing timeouts
        if (gameState.stimulusTimeout) {
            clearTimeout(gameState.stimulusTimeout);
            gameState.stimulusTimeout = null;
        }
        
        // Update UI
        stimulus.textContent = '';
        updateProgressDisplay();
        
        // Add a small delay before starting next stage
        setTimeout(() => {
            presentStimulus();
        }, 1000);
    }
    
    // Event Listeners
    startBtn.addEventListener('click', initTest);
    respondBtn.addEventListener('click', handleResponse);
    skipStageBtn.addEventListener('click', moveToNextStage);
    endTestBtn.addEventListener('click', () => endTest(false));
    saveResultsBtn.addEventListener('click', saveResults);
    restartBtn.addEventListener('click', () => {
        results.style.display = 'none';
        instructions.style.display = 'block';
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        // Spacebar for response
        if (e.code === 'Space' && gameState.isRunning) {
            e.preventDefault();
            handleResponse();
        }
        
        // Escape to end test
        if (e.code === 'Escape' && gameState.isRunning) {
            e.preventDefault();
            endTest(false);
        }
    });

    // Prevent spacebar from scrolling the page
    window.addEventListener('keydown', function(e) {
        if(e.code === 'Space' && e.target === document.body) {
            e.preventDefault();
        }
    });
});
