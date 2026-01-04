// Letter-Number Span Test for MCCB
// Based on the Letter-Number Sequencing subtest of the WAIS-IV

// Function to generate a random number between min and max (inclusive)
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to generate a random letter from A to J
function getRandomLetter() {
    return String.fromCharCode(65 + Math.floor(Math.random() * 10)); // A-J
}

// Function to generate a random sequence of numbers and letters
function generateSequence(length) {
    const sequence = [];
    const usedNumbers = new Set();
    const usedLetters = new Set();
    
    // Determine how many numbers and letters to use (at least one of each if length > 1)
    const numCount = length === 1 ? 1 : getRandomInt(1, length - 1);
    const letterCount = length - numCount;
    
    // Add numbers
    while (sequence.length < numCount) {
        const num = getRandomInt(1, 10);
        if (!usedNumbers.has(num)) {
            sequence.push(num.toString());
            usedNumbers.add(num);
        }
    }
    
    // Add letters
    while (sequence.length < length) {
        const letter = getRandomLetter();
        if (!usedLetters.has(letter)) {
            sequence.push(letter);
            usedLetters.add(letter);
        }
    }
    
    // Shuffle the sequence
    for (let i = sequence.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
    }
    
    return sequence;
}

// Generate sequences with increasing difficulty
function generateSequences() {
    const sequences = [];
    for (let i = 2; i <= 11; i++) {
        sequences.push(generateSequence(i));
    }
    return sequences;
}

// Generate sequences for the test
let sequences = generateSequences();

// Test state
let currentTrial = 0;
let score = 0;
let displayTime = 1000; // Time each item is displayed in ms

// DOM elements
const sequenceDisplay = document.getElementById('sequenceDisplay');
const userInput = document.getElementById('userInput');
const feedback = document.getElementById('feedback');
const trialCount = document.getElementById('trialCount');
const scoreDisplay = document.getElementById('score');
const finalScore = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const submitBtn = document.getElementById('submitBtn');
const restartBtn = document.getElementById('restartBtn');
const endTestBtn = document.getElementById('endTestBtn');
const instructions = document.getElementById('instructions');
const testArea = document.getElementById('testArea');
const results = document.getElementById('results');

// DOM elements
const restartDuringTestBtn = document.getElementById('restartDuringTestBtn');

// Event listeners
startBtn.addEventListener('click', startTest);
submitBtn.addEventListener('click', checkAnswer);
restartBtn.addEventListener('click', restartTest);
endTestBtn.addEventListener('click', endTestEarly);
restartDuringTestBtn.addEventListener('click', function() {
    if (confirm('Are you sure you want to restart the test? Your current progress will be lost.')) {
        restartTest();
    }
});
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        checkAnswer();
    }
});

// End test early function
function endTestEarly() {
    if (confirm('Are you sure you want to end the test early? Your current progress will be saved and you will see your results.')) {
        // Clear any ongoing timeouts
        if (window.sequenceTimeout) {
            clearTimeout(window.sequenceTimeout);
        }
        
        // End the test immediately
        endTest();
    }
}

// Start the test
function startTest() {
    instructions.style.display = 'none';
    testArea.style.display = 'block';
    restartDuringTestBtn.style.display = 'inline-block';
    currentTrial = 0;
    score = 0;
    updateScore();
    showSequence();
}

// Show the current sequence
function showSequence() {
    if (currentTrial >= sequences.length) {
        endTest();
        return;
    }
    
    const sequence = sequences[currentTrial];
    let index = 0;
    
    sequenceDisplay.textContent = '';
    userInput.value = '';
    feedback.textContent = '';
    userInput.disabled = true;
    submitBtn.disabled = true;
    
    // Display each item in the sequence one at a time
    function showNextItem() {
        if (index < sequence.length) {
            sequenceDisplay.textContent = sequence[index];
            index++;
            setTimeout(showNextItem, displayTime);
        } else {
            sequenceDisplay.textContent = '?';
            userInput.disabled = false;
            submitBtn.disabled = false;
            userInput.focus();
        }
    }
    
    showNextItem();
}

// Check the user's answer
function checkAnswer() {
    const userAnswer = userInput.value.trim().toUpperCase();
    const sequence = sequences[currentTrial];
    
    // Sort numbers and letters separately
    const numbers = [];
    const letters = [];
    
    sequence.forEach(item => {
        if (!isNaN(parseInt(item))) {
            numbers.push(parseInt(item));
        } else {
            letters.push(item);
        }
    });
    
    // Sort numbers and letters
    numbers.sort((a, b) => a - b);
    letters.sort();
    
    // Create correct answer string
    const correctAnswer = [...numbers, ...letters].join(' ');
    
    // Check if answer is correct
    if (userAnswer === correctAnswer) {
        score++;
        feedback.textContent = 'Correct!';
        feedback.className = 'feedback correct';
    } else {
        feedback.textContent = `Incorrect. The correct answer was: ${correctAnswer}`;
        feedback.className = 'feedback incorrect';
    }
    
    updateScore();
    
    // Move to next trial after a short delay
    currentTrial++;
    trialCount.textContent = Math.min(currentTrial + 1, sequences.length);
    
    setTimeout(() => {
        if (currentTrial < sequences.length) {
            showSequence();
        } else {
            endTest();
        }
    }, 1500);
}

// Update the score display
function updateScore() {
    scoreDisplay.textContent = score;
}

// End the test
function endTest() {
    testArea.style.display = 'none';
    results.style.display = 'block';
    finalScore.textContent = score;
    
    // Save the results
    saveResults(score);
    
    // Show export button if it exists
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.style.display = 'inline-block';
    }
}

// Save test results
function saveResults(score) {
    const testData = {
        testName: 'Letter-Number Span',
        date: new Date().toISOString(),
        score: score,
        maxScore: sequences.length,
        rawData: {
            trials: sequences.map((seq, index) => ({
                trialNumber: index + 1,
                sequence: seq.join(' '),
                length: seq.length
            })),
            correctAnswers: score,
            incorrectAnswers: sequences.length - score,
            percentage: Math.round((score / sequences.length) * 100)
        }
    };
    
    // Store the test data for export
    window.lastTestData = testData;
    
    // Enable export button if it exists
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.style.display = 'inline-block';
    }
    
    return testData;
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

// Export test results as XML file
function exportResults() {
    if (!window.lastTestData) {
        alert('No test data available to export.');
        return;
    }
    
    // Convert data to XML format
    function jsonToXml(data) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<testResult>\n';
        
        // Add test metadata
        xml += `  <testName>${escapeXml(data.testName)}</testName>\n`;
        xml += `  <date>${escapeXml(data.date)}</date>\n`;
        xml += `  <score>${escapeXml(data.score)}</score>\n`;
        xml += `  <maxScore>${escapeXml(data.maxScore)}</maxScore>\n`;
        
        // Add raw data
        xml += '  <rawData>\n';
        xml += '    <trials>\n';
        data.rawData.trials.forEach((trial, index) => {
            xml += `      <trial id="${index + 1}">\n`;
            xml += `        <trialNumber>${escapeXml(trial.trialNumber)}</trialNumber>\n`;
            xml += `        <sequence>${escapeXml(trial.sequence)}</sequence>\n`;
            xml += `        <length>${escapeXml(trial.length)}</length>\n`;
            xml += '      </trial>\n';
        });
        xml += '    </trials>\n';
        xml += `    <correctAnswers>${escapeXml(data.rawData.correctAnswers)}</correctAnswers>\n`;
        xml += `    <incorrectAnswers>${escapeXml(data.rawData.incorrectAnswers)}</incorrectAnswers>\n`;
        xml += `    <percentage>${escapeXml(data.rawData.percentage)}</percentage>\n`;
        xml += '  </rawData>\n';
        
        xml += '</testResult>';
        return xml;
    }
    
    const xmlData = jsonToXml(window.lastTestData);
    const blob = new Blob([xmlData], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    const exportFileDefaultName = `letter_number_span_results_${new Date().toISOString().split('T')[0]}.xml`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    // Clean up
    URL.revokeObjectURL(url);
}

// Restart the test
function restartTest() {
    // Hide results and reset UI elements
    results.style.display = 'none';
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.style.display = 'none';
    }
    
    // Clear any ongoing timeouts
    if (window.sequenceTimeout) {
        clearTimeout(window.sequenceTimeout);
    }
    
    // Reset test state and generate new sequences
    currentTrial = 0;
    score = 0;
    sequences = generateSequences();
    trialCount.textContent = '1';
    sequenceDisplay.textContent = '';
    userInput.value = '';
    feedback.textContent = '';
    
    console.log('New sequences:', sequences); // For debugging
    
    // Restart the test
    startTest();
}
