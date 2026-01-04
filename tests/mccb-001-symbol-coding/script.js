// Symbol-number mapping (standard BACS symbols)
const symbolMap = {
    '☺': '1',
    '♫': '2',
    '☼': '3',
    '♠': '4',
    '☎': '5',
    '∞': '6',
    '☮': '7',
    '⚡': '8',
    '⚽': '9'
};

// Test configuration
const TEST_DURATION = 90; // 90 seconds for the test
const ITEMS_PER_ROW = 10;
const TOTAL_ITEMS = 150; // Total number of test items

let timeLeft = TEST_DURATION;
let timer;
let testStarted = false;
let answers = [];
let correctAnswers = [];
let startTime;

// DOM elements
const instructionsEl = document.getElementById('instructions');
const testAreaEl = document.getElementById('testArea');
const keyGridEl = document.getElementById('keyGrid');
const testGridEl = document.getElementById('testGrid');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const timeTakenEl = document.getElementById('timeTaken');
const resultsEl = document.getElementById('results');

// Initialize the test
function initTest() {
    // Populate key grid
    keyGridEl.innerHTML = '';
    Object.entries(symbolMap).forEach(([symbol, number]) => {
        const keyItem = document.createElement('div');
        keyItem.className = 'key';
        keyItem.innerHTML = `${symbol} = ${number}`;
        keyGridEl.appendChild(keyItem);
    });

    // Generate test items
    testGridEl.innerHTML = '';
    answers = [];
    correctAnswers = [];

    // Create test symbols (random order but consistent for the test)
    const symbols = Object.keys(symbolMap);
    for (let i = 0; i < TOTAL_ITEMS; i++) {
        const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
        correctAnswers.push(symbolMap[randomSymbol]);

        const symbolCell = document.createElement('div');
        symbolCell.className = 'symbol';
        symbolCell.textContent = randomSymbol;

        const inputCell = document.createElement('div');
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 1;
        input.dataset.index = i;
        input.addEventListener('input', (e) => {
            // Only allow numbers
            e.target.value = e.target.value.replace(/[^1-9]/g, '');
            
            if (e.target.value) {
                // Auto-scroll to keep current input in view
                const rowHeight = e.target.closest('.coding-grid').offsetHeight;
                const container = document.querySelector('.test-content');
                const inputRect = e.target.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                
                // If input is near bottom of container, scroll down by one row
                if (inputRect.bottom > containerRect.bottom - 50) {
                    container.scrollBy({
                        top: rowHeight,
                        behavior: 'smooth'
                    });
                }
                
                // Auto-focus next input
                if (i < TOTAL_ITEMS - 1) {
                    const nextInput = document.querySelector(`input[data-index="${parseInt(i)+1}"]`);
                    if (nextInput) {
                        nextInput.focus();
                    }
                }
            }
        });
        inputCell.appendChild(input);

        testGridEl.appendChild(symbolCell);
        testGridEl.appendChild(inputCell);
    }
}

// Start the test
function startTest() {
    testStarted = true;
    timeLeft = TEST_DURATION;
    startTime = new Date();
    updateTimer();
    timer = setInterval(updateTimer, 1000);
    
    // Focus first input
    const firstInput = document.querySelector('input');
    if (firstInput) firstInput.focus();
}

// Update timer display
function updateTimer() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    if (timeLeft <= 0) {
        clearInterval(timer);
        submitTest();
    } else {
        timeLeft--;
    }
}

// Generate XML export
function generateXML(score, timeTaken) {
    const now = new Date();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<BACS_Test_Results>
    <Test_Info>
        <Test_Name>BACS Symbol Coding Test</Test_Name>
        <Test_Date>${now.toISOString().split('T')[0]}</Test_Date>
        <Test_Time>${now.toTimeString().split(' ')[0]}</Test_Time>
        <Test_Duration_Seconds>${TEST_DURATION}</Test_Duration_Seconds>
    </Test_Info>
    <Results>
        <Score>${score}</Score>
        <Max_Score>${TOTAL_ITEMS}</Max_Score>
        <Percentage>${((score / TOTAL_ITEMS) * 100).toFixed(2)}%</Percentage>
        <Time_Taken_Seconds>${timeTaken}</Time_Taken_Seconds>
        <Time_Per_Item>${(timeTaken / TOTAL_ITEMS).toFixed(2)}</Time_Per_Item>
    </Results>
    <Test_Configuration>
        <Total_Items>${TOTAL_ITEMS}</Total_Items>
        <Items_Per_Row>${ITEMS_PER_ROW}</Items_Per_Row>
    </Test_Configuration>
</BACS_Test_Results>`;
    
    return xml;
}

// Export XML to file
function exportToXML(score, timeTaken) {
    const xml = generateXML(score, timeTaken);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BACS_Test_Results_${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Submit and score the test
function submitTest() {
    clearInterval(timer);
    testStarted = false;
    
    // Calculate score
    const inputs = document.querySelectorAll('input');
    let score = 0;
    
    inputs.forEach((input, index) => {
        if (input.value === correctAnswers[index]) {
            score++;
            input.style.backgroundColor = '#d4edda';
        } else if (input.value) {
            input.style.backgroundColor = '#f8d7da';
        }
    });
    
    // Calculate time taken
    const endTime = new Date();
    const timeTaken = Math.min(TEST_DURATION - timeLeft, TEST_DURATION);
    
    // Generate and export XML
    exportToXML(score, timeTaken);
    
    // Display results
    scoreEl.textContent = score;
    timeTakenEl.textContent = timeTaken;
    testAreaEl.style.display = 'none';
    resultsEl.style.display = 'block';
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('startBtn').addEventListener('click', () => {
        instructionsEl.style.display = 'none';
        testAreaEl.style.display = 'block';
        document.getElementById('testContent').style.display = 'block';
        initTest();
        startTest();
    });

    document.getElementById('submitBtn').addEventListener('click', submitTest);

    document.getElementById('restartBtn').addEventListener('click', () => {
        resultsEl.style.display = 'none';
        testAreaEl.style.display = 'none';
        document.getElementById('testContent').style.display = 'none';
        instructionsEl.style.display = 'block';
    });
});
