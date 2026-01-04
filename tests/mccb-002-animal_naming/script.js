document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const submitBtn = document.getElementById('submitBtn');
    const animalInput = document.getElementById('animalInput');
    const wordList = document.getElementById('wordList');
    const wordCount = document.getElementById('wordCount');
    const totalWords = document.getElementById('totalWords');
    const reviewList = document.getElementById('reviewList');
    const saveBtn = document.getElementById('saveBtn');
    const restartBtn = document.getElementById('restartBtn');
    const instructions = document.getElementById('instructions');
    const testArea = document.getElementById('testArea');
    const results = document.getElementById('results');
    const timerElement = document.getElementById('timer');
    const ageInput = document.getElementById('ageInput');
    const percentileInfo = document.getElementById('percentileInfo');
    const percentile = document.getElementById('percentile');
    const interpretation = document.getElementById('interpretation');

    let timeLeft = 60; // 60 seconds
    let timer;
    let words = [];
    let testInProgress = false;
    let userAge = null;

    // Age group percentiles (50th percentile values for each age group)
    const percentiles = {
        '18-25': { min: 18, max: 25, p50: 22, p25: 18, p75: 26 },
        '26-35': { min: 26, max: 35, p50: 20, p25: 16, p75: 24 },
        '36-45': { min: 36, max: 45, p50: 18, p25: 14, p75: 22 },
        '46-55': { min: 46, max: 55, p50: 17, p25: 13, p75: 21 },
        '56-65': { min: 56, max: 65, p50: 16, p25: 12, p75: 20 },
        '66+': { min: 66, max: 100, p50: 15, p25: 11, p75: 19 }
    };

    // Start the test
    startBtn.addEventListener('click', startTest);
    submitBtn.addEventListener('click', endTest);
    saveBtn.addEventListener('click', saveResults);
    restartBtn.addEventListener('click', restartTest);

    // Handle Enter key in the input field
    animalInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const inputText = animalInput.value.trim();
            if (inputText && testInProgress) {
                processMultipleWords(inputText);
                animalInput.value = '';
            }
        }
    });

    function processMultipleWords(inputText) {
        // Split on spaces and commas, filter out empty strings
        const inputWords = inputText.split(/[\s,]+/).filter(word => word.trim().length > 0);
        
        let addedCount = 0;
        inputWords.forEach(word => {
            if (addWord(word)) {
                addedCount++;
            }
        });
        
        if (addedCount === 0 && inputWords.length > 0) {
            showTemporaryMessage('No valid words were added', 'error');
        } else if (addedCount < inputWords.length) {
            showTemporaryMessage(`Added ${addedCount} of ${inputWords.length} words`, 'info');
        }
    }

    function startTest() {
        // Get and validate age
        const age = parseInt(ageInput.value);
        if (!age || age < 16 || age > 100) {
            showTemporaryMessage('Please enter a valid age (16-100) for percentile comparison', 'error');
            ageInput.focus();
            return;
        }
        
        userAge = age;
        
        instructions.style.display = 'none';
        testArea.style.display = 'block';
        animalInput.disabled = false;
        animalInput.focus();
        testInProgress = true;
        words = [];
        updateWordCount();
        startTimer();
    }

    function startTimer() {
        timeLeft = 60;
        updateTimer();
        timer = setInterval(() => {
            timeLeft--;
            updateTimer();
            if (timeLeft <= 0) {
                endTest();
            }
        }, 1000);
    }

    function updateTimer() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    function addWord(word) {
        // Basic validation
        if (!word) return false;
        
        const lowerWord = word.toLowerCase().trim();
        
        // Check for exact duplicates (case insensitive)
        if (words.some(w => w.toLowerCase() === lowerWord)) {
            showTemporaryMessage(`"${word}" has already been used`, 'error');
            return false;
        }
        
        // Check for potential typos or similar words
        const similarWord = findSimilarWord(lowerWord, words);
        if (similarWord) {
            const confirmed = confirm(`Did you mean "${similarWord}" instead of "${word}"?\n\nClick OK to use "${similarWord}" or Cancel to keep "${word}".`);
            if (confirmed) {
                // If user confirms the suggested word, use it instead
                if (words.some(w => w.toLowerCase() === similarWord.toLowerCase())) {
                    showTemporaryMessage(`"${similarWord}" has already been used`, 'error');
                    return false;
                }
                word = similarWord; // Use the suggested version
            }
        }

        // Add to words array
        words.push(word);
        updateWordCount();
        
        // Add to word list display
        const wordElement = document.createElement('span');
        wordElement.className = 'word';
        wordElement.textContent = word;
        wordList.appendChild(wordElement);
        
        // Auto-scroll to the new word
        wordElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return true;
    }

    // Calculate Levenshtein distance between two strings
    function levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        
        const matrix = [];
        
        // Initialize the matrix
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        
        // Fill in the matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i-1) === a.charAt(j-1)) {
                    matrix[i][j] = matrix[i-1][j-1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i-1][j-1] + 1, // substitution
                        matrix[i][j-1] + 1,   // insertion
                        matrix[i-1][j] + 1    // deletion
                    );
                }
            }
        }
        
        return matrix[b.length][a.length];
    }
    
    // Find similar words in the list using Levenshtein distance
    function findSimilarWord(word, wordList) {
        // Only check for similar words if the word is at least 4 characters long
        if (word.length < 4) return null;
        
        // Calculate distances to all words and find the closest one
        let minDistance = Infinity;
        let closestWord = null;
        
        for (const existingWord of wordList) {
            const distance = levenshteinDistance(word, existingWord.toLowerCase());
            const maxAllowedDistance = Math.min(3, Math.floor(existingWord.length / 2));
            
            if (distance > 0 && distance <= maxAllowedDistance && distance < minDistance) {
                minDistance = distance;
                closestWord = existingWord;
            }
        }
        
        return closestWord;
    }

    function updateWordCount() {
        const count = words.length;
        wordCount.textContent = count;
        wordCount.className = count >= 20 ? 'high-score' : '';
    }

    function endTest() {
        clearInterval(timer);
        testInProgress = false;
        animalInput.disabled = true;
        testArea.style.display = 'none';
        results.style.display = 'block';
        
        // Display results
        const count = words.length;
        totalWords.textContent = count;
        
        // Calculate and display percentile information
        if (userAge) {
            const percentileData = calculatePercentile(count, userAge);
            displayPercentileInfo(percentileData);
        }
        
        // Show words in review
        reviewList.innerHTML = '';
        words.forEach((word, index) => {
            const item = document.createElement('div');
            item.className = 'review-item';
            item.innerHTML = `<span class="word-num">${index + 1}.</span> ${word}`;
            reviewList.appendChild(item);
        });
    }

    function calculatePercentile(score, age) {
        // Find the appropriate age group
        let ageGroup = null;
        for (const [groupName, groupData] of Object.entries(percentiles)) {
            if (age >= groupData.min && age <= groupData.max) {
                ageGroup = groupData;
                break;
            }
        }
        
        if (!ageGroup) {
            return { percentile: 'Unknown', interpretation: 'Age group not found' };
        }
        
        // Calculate estimated percentile based on score
        const { p25, p50, p75 } = ageGroup;
        
        if (score >= p75) {
            return { percentile: '75th+', interpretation: 'Excellent performance - well above average' };
        } else if (score >= p50) {
            return { percentile: '50th-74th', interpretation: 'Good performance - above average' };
        } else if (score >= p25) {
            return { percentile: '25th-49th', interpretation: 'Average performance' };
        } else {
            return { percentile: '<25th', interpretation: 'Below average performance - may indicate difficulty' };
        }
    }

    function displayPercentileInfo(data) {
        percentileInfo.style.display = 'block';
        percentile.textContent = data.percentile;
        interpretation.textContent = data.interpretation;
        
        // Add color coding based on performance
        if (data.percentile === '75th+') {
            interpretation.style.color = '#28a745'; // Green for excellent
        } else if (data.percentile === '<25th') {
            interpretation.style.color = '#dc3545'; // Red for below average
        } else {
            interpretation.style.color = '#6c757d'; // Gray for average
        }
    }

    function saveResults() {
        const percentileData = userAge ? calculatePercentile(words.length, userAge) : null;
        
        const data = {
            test: 'Animal Naming',
            score: words.length,
            words: words,
            age: userAge,
            percentile: percentileData ? percentileData.percentile : null,
            interpretation: percentileData ? percentileData.interpretation : null,
            date: new Date().toISOString(),
            timeTaken: 60 - timeLeft,
            testDuration: 60,
            timestamp: new Date().toLocaleString()
        };
        
        // Convert data to XML format
        function jsonToXml(json) {
            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += '<testResult>\n';
            
            // Add test metadata
            xml += `  <testName>${escapeXml(json.test)}</testName>\n`;
            xml += `  <score>${escapeXml(json.score)}</score>\n`;
            if (json.age) xml += `  <age>${escapeXml(json.age)}</age>\n`;
            if (json.percentile) xml += `  <percentile>${escapeXml(json.percentile)}</percentile>\n`;
            if (json.interpretation) xml += `  <interpretation>${escapeXml(json.interpretation)}</interpretation>\n`;
            xml += `  <date>${escapeXml(json.date)}</date>\n`;
            xml += `  <timeTaken>${escapeXml(json.timeTaken)}</timeTaken>\n`;
            xml += `  <testDuration>${escapeXml(json.testDuration)}</testDuration>\n`;
            xml += `  <timestamp>${escapeXml(json.timestamp)}</timestamp>\n`;
            
            // Add words list
            xml += '  <words>\n';
            json.words.forEach((word, index) => {
                xml += `    <word id="${index + 1}">${escapeXml(word)}</word>\n`;
            });
            xml += '  </words>\n';
            
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
        
        // Create and trigger download
        function downloadXml(xml, filename) {
            const blob = new Blob([xml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'animal_naming_results.xml';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        // Generate XML and trigger download
        const xmlData = jsonToXml(data);
        const filename = `animal_naming_${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;
        downloadXml(xmlData, filename);
        
        showTemporaryMessage('Results downloaded as XML file', 'success');
    }

    function restartTest() {
        // Reset everything
        words = [];
        wordList.innerHTML = '';
        reviewList.innerHTML = '';
        animalInput.value = '';
        ageInput.value = '';
        userAge = null;
        percentileInfo.style.display = 'none';
        
        // Show instructions again
        results.style.display = 'none';
        instructions.style.display = 'block';
    }

    function showTemporaryMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        // Add to container
        const container = document.querySelector('.container');
        container.appendChild(messageDiv);
        
        // Remove after delay
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }
});
