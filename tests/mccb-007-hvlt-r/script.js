// HVLT-R Test Implementation
class HVLTRTest {
    constructor() {
        this.currentScreen = 'welcome';
        this.currentTrial = 1;
        this.developerMode = false;
        
        // Test data - 12 words in 3 semantic categories (4 words each)
        this.wordLists = {
            form1: {
                words: ['shirt', 'dress', 'pants', 'coat', 'apple', 'banana', 'orange', 'grape', 'hammer', 'saw', 'drill', 'wrench'],
                categories: ['clothing', 'fruit', 'tools'],
                distractors: ['socks', 'skirt', 'jacket', 'belt', 'pear', 'peach', 'melon', 'berry', 'screwdriver', 'pliers', 'chisel', 'level']
            }
        };
        
        this.currentWordList = this.wordLists.form1.words;
        this.currentDistractors = this.wordLists.form1.distractors;
        
        // Test results
        this.testResults = {
            immediateRecall: [],
            delayedRecall: [],
            recognition: [],
            totalRecallScore: 0,
            learningScore: 0,
            delayedRecallScore: 0,
            retentionScore: 0,
            truePositives: 0,
            falsePositives: 0,
            discriminationIndex: 0
        };
        
        this.initializeEventListeners();
    }
    
    initializeEventListeners() {
        // Developer mode
        document.getElementById('developerMode').addEventListener('change', (e) => {
            this.developerMode = e.target.checked;
            document.getElementById('developerPanel').style.display = this.developerMode ? 'block' : 'none';
        });
        
        // Developer controls
        document.getElementById('skipToRecall').addEventListener('click', () => this.skipToRecall());
        document.getElementById('skipToDelayedRecall').addEventListener('click', () => this.skipToDelayedRecall());
        document.getElementById('skipToRecognition').addEventListener('click', () => this.skipToRecognition());
        document.getElementById('showResults').addEventListener('click', () => this.showResults());
        document.getElementById('resetTest').addEventListener('click', () => this.resetTest());
        
        // Main navigation
        document.getElementById('startTest').addEventListener('click', () => this.startTest());
        document.getElementById('startWordPresentation').addEventListener('click', () => this.startWordPresentation());
        document.getElementById('proceedToRecall').addEventListener('click', () => this.proceedToRecall());
        document.getElementById('submitRecall').addEventListener('click', () => this.submitRecall());
        document.getElementById('clearRecall').addEventListener('click', () => this.clearRecall());
        document.getElementById('skipDelay').addEventListener('click', () => this.skipDelay());
        document.getElementById('submitDelayedRecall').addEventListener('click', () => this.submitDelayedRecall());
        document.getElementById('clearDelayedRecall').addEventListener('click', () => this.clearDelayedRecall());
        document.getElementById('submitRecognition').addEventListener('click', () => this.submitRecognition());
        document.getElementById('downloadResults').addEventListener('click', () => this.downloadResults());
        document.getElementById('restartTest').addEventListener('click', () => this.restartTest());
    }
    
    // Screen navigation
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }
    
    // Developer mode functions
    skipToRecall() {
        this.showScreen('immediateRecall');
        document.getElementById('recallTrialNumber').textContent = this.currentTrial;
    }
    
    skipToDelayedRecall() {
        this.showScreen('delayedRecall');
    }
    
    skipToRecognition() {
        this.setupRecognitionTrial();
        this.showScreen('recognitionTrial');
    }
    
    showResults() {
        console.log('showResults called');
        console.log('testResults:', this.testResults);
        console.log('immediateRecall length:', this.testResults.immediateRecall.length);
        console.log('delayedRecall length:', this.testResults.delayedRecall.length);
        
        // Check if there's any test data to show
        if (this.testResults.immediateRecall.length === 0 && this.testResults.delayedRecall.length === 0) {
            console.log('No test data available');
            alert('No test data available. Please complete at least one trial before showing results.');
            return;
        }
        
        console.log('Calculating results...');
        this.calculateResults();
        console.log('Displaying results...');
        this.displayResults();
        console.log('Showing results screen...');
        this.showScreen('resultsScreen');
    }
    
    resetTest() {
        this.currentTrial = 1;
        this.testResults = {
            immediateRecall: [],
            delayedRecall: [],
            recognition: [],
            totalRecallScore: 0,
            learningScore: 0,
            delayedRecallScore: 0,
            retentionScore: 0,
            truePositives: 0,
            falsePositives: 0,
            discriminationIndex: 0
        };
        this.showScreen('welcomeScreen');
    }
    
    // Test flow functions
    startTest() {
        this.currentTrial = 1;
        this.testResults.immediateRecall = [];
        document.getElementById('trialNumber').textContent = this.currentTrial;
        this.showScreen('learningTrial');
    }
    
    async startWordPresentation() {
        const startButton = document.getElementById('startWordPresentation');
        const presentation = document.getElementById('wordPresentation');
        const proceedButton = document.getElementById('proceedToRecall');
        
        startButton.style.display = 'none';
        presentation.style.display = 'block';
        proceedButton.style.display = 'none';
        
        const currentWordEl = document.getElementById('currentWord');
        const wordCounterEl = document.getElementById('wordCounter');
        
        for (let i = 0; i < this.currentWordList.length; i++) {
            currentWordEl.textContent = this.currentWordList[i];
            wordCounterEl.textContent = `Word ${i + 1} of ${this.currentWordList.length}`;
            
            if (!this.developerMode) {
                await this.delay(2000); // 2 seconds per word
            } else {
                await this.delay(200); // Faster in developer mode
            }
        }
        
        currentWordEl.textContent = 'Presentation Complete';
        wordCounterEl.textContent = '';
        proceedButton.style.display = 'inline-block';
    }
    
    proceedToRecall() {
        document.getElementById('recallTrialNumber').textContent = this.currentTrial;
        this.showScreen('immediateRecall');
    }
    
    submitRecall() {
        const input = document.getElementById('recallInput').value.trim();
        if (!input) {
            this.showFeedback('recallFeedback', 'Please enter some words before submitting.', 'info');
            return;
        }
        
        const recalledWords = this.parseRecallInput(input);
        const correctWords = this.scoreRecall(recalledWords);
        const score = correctWords.length;
        
        this.testResults.immediateRecall.push({
            trial: this.currentTrial,
            recalledWords: recalledWords,
            correctWords: correctWords,
            score: score
        });
        
        this.showFeedback('recallFeedback', `You recalled ${score} words correctly: ${correctWords.join(', ')}`, 'success');
        
        setTimeout(() => {
            if (this.currentTrial < 3) {
                this.currentTrial++;
                document.getElementById('trialNumber').textContent = this.currentTrial;
                document.getElementById('startWordPresentation').style.display = 'inline-block';
                document.getElementById('wordPresentation').style.display = 'none';
                document.getElementById('proceedToRecall').style.display = 'none';
                document.getElementById('recallInput').value = '';
                document.getElementById('recallFeedback').textContent = '';
                this.showScreen('learningTrial');
            } else {
                this.showScreen('delayPeriod');
                this.startDelayTimer();
            }
        }, 3000);
    }
    
    clearRecall() {
        document.getElementById('recallInput').value = '';
        document.getElementById('recallFeedback').textContent = '';
    }
    
    startDelayTimer() {
        let timeLeft = 25 * 60; // 25 minutes in seconds
        const timerDisplay = document.querySelector('.timer-display');
        
        const timer = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            timeLeft--;
            if (timeLeft < 0) {
                clearInterval(timer);
                this.showScreen('delayedRecall');
            }
        }, 1000);
        
        this.currentTimer = timer;
    }
    
    skipDelay() {
        if (this.currentTimer) {
            clearInterval(this.currentTimer);
        }
        this.showScreen('delayedRecall');
    }
    
    submitDelayedRecall() {
        const input = document.getElementById('delayedRecallInput').value.trim();
        if (!input) {
            this.showFeedback('delayedRecallFeedback', 'Please enter some words before submitting.', 'info');
            return;
        }
        
        const recalledWords = this.parseRecallInput(input);
        const correctWords = this.scoreRecall(recalledWords);
        const score = correctWords.length;
        
        this.testResults.delayedRecall = {
            recalledWords: recalledWords,
            correctWords: correctWords,
            score: score
        };
        
        this.showFeedback('delayedRecallFeedback', `You recalled ${score} words correctly: ${correctWords.join(', ')}`, 'success');
        
        setTimeout(() => {
            this.setupRecognitionTrial();
            this.showScreen('recognitionTrial');
        }, 3000);
    }
    
    clearDelayedRecall() {
        document.getElementById('delayedRecallInput').value = '';
        document.getElementById('delayedRecallFeedback').textContent = '';
    }
    
    setupRecognitionTrial() {
        const recognitionWords = document.getElementById('recognitionWords');
        recognitionWords.innerHTML = '';
        
        // Combine target words with distractors
        const allWords = [...this.currentWordList, ...this.currentDistractors];
        // Shuffle the array
        for (let i = allWords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allWords[i], allWords[j]] = [allWords[j], allWords[i]];
        }
        
        allWords.forEach((word, index) => {
            const wordDiv = document.createElement('div');
            wordDiv.className = 'recognition-word';
            wordDiv.innerHTML = `
                <div class="word-text">${word}</div>
                <div class="word-buttons">
                    <button class="yes" data-word="${word}" data-response="yes">YES</button>
                    <button class="no" data-word="${word}" data-response="no">NO</button>
                </div>
            `;
            recognitionWords.appendChild(wordDiv);
        });
        
        // Add event listeners to recognition buttons
        recognitionWords.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (e) => {
                const wordDiv = e.target.closest('.recognition-word');
                wordDiv.querySelectorAll('button').forEach(btn => btn.classList.remove('selected'));
                e.target.classList.add('selected');
            });
        });
    }
    
    submitRecognition() {
        const selectedButtons = document.querySelectorAll('.recognition-word button.selected');
        if (selectedButtons.length !== 24) {
            this.showFeedback('recognitionFeedback', 'Please make a selection for all words.', 'info');
            return;
        }
        
        let truePositives = 0;
        let falsePositives = 0;
        const recognitionResults = [];
        
        selectedButtons.forEach(button => {
            const word = button.dataset.word;
            const response = button.dataset.response;
            const isTarget = this.currentWordList.includes(word);
            
            recognitionResults.push({
                word: word,
                response: response,
                isTarget: isTarget,
                correct: (response === 'yes' && isTarget) || (response === 'no' && !isTarget)
            });
            
            if (response === 'yes' && isTarget) {
                truePositives++;
            } else if (response === 'yes' && !isTarget) {
                falsePositives++;
            }
        });
        
        this.testResults.recognition = recognitionResults;
        this.testResults.truePositives = truePositives;
        this.testResults.falsePositives = falsePositives;
        
        this.showFeedback('recognitionFeedback', `Recognition complete. You identified ${truePositives} target words correctly and made ${falsePositives} false positive errors.`, 'success');
        
        setTimeout(() => {
            this.calculateResults();
            this.displayResults();
            this.showScreen('resultsScreen');
        }, 3000);
    }
    
    // Scoring functions
    parseRecallInput(input) {
        // Split by commas or spaces, filter out empty strings
        return input.split(/[\s,]+/)
                   .map(word => word.toLowerCase().trim())
                   .filter(word => word.length > 0);
    }
    
    scoreRecall(recalledWords) {
        const targetWordsLower = this.currentWordList.map(word => word.toLowerCase());
        return recalledWords.filter(word => targetWordsLower.includes(word));
    }
    
    calculateResults() {
        // Total recall score (sum of all completed trials)
        this.testResults.totalRecallScore = this.testResults.immediateRecall.reduce((sum, trial) => sum + trial.score, 0);
        
        // Learning score (best of trial 2 or 3 minus trial 1) - only if we have enough trials
        if (this.testResults.immediateRecall.length >= 2) {
            const trial1Score = this.testResults.immediateRecall[0].score;
            const trial2Score = this.testResults.immediateRecall[1].score;
            const trial3Score = this.testResults.immediateRecall.length >= 3 ? this.testResults.immediateRecall[2].score : trial2Score;
            this.testResults.learningScore = Math.max(trial2Score, trial3Score) - trial1Score;
        } else {
            this.testResults.learningScore = 0;
        }
        
        // Delayed recall score - only if delayed recall exists
        if (this.testResults.delayedRecall && this.testResults.delayedRecall.score !== undefined) {
            this.testResults.delayedRecallScore = this.testResults.delayedRecall.score;
        } else {
            this.testResults.delayedRecallScore = 0;
        }
        
        // Retention score (percentage) - only if we have learning and delayed recall data
        if (this.testResults.immediateRecall.length >= 2 && this.testResults.delayedRecall && this.testResults.delayedRecall.score !== undefined) {
            const trial2Score = this.testResults.immediateRecall[1].score;
            const trial3Score = this.testResults.immediateRecall.length >= 3 ? this.testResults.immediateRecall[2].score : trial2Score;
            const bestLearningScore = Math.max(trial2Score, trial3Score);
            this.testResults.retentionScore = bestLearningScore > 0 ? 
                Math.round((this.testResults.delayedRecallScore / bestLearningScore) * 100) : 0;
        } else {
            this.testResults.retentionScore = 0;
        }
        
        // Discrimination index - only if recognition data exists
        if (this.testResults.recognition && this.testResults.recognition.length > 0) {
            this.testResults.discriminationIndex = this.testResults.truePositives - this.testResults.falsePositives;
        } else {
            this.testResults.discriminationIndex = 0;
        }
    }
    
    displayResults() {
        const resultsContent = document.getElementById('resultsContent');
        resultsContent.innerHTML = `
            <div class="result-section">
                <h3>Immediate Recall Trials</h3>
                ${this.testResults.immediateRecall.map(trial => `
                    <div class="result-item">
                        <span class="result-label">Trial ${trial.trial}</span>
                        <span class="result-value">${trial.score}/12 words</span>
                    </div>
                `).join('')}
                <div class="result-item">
                    <span class="result-label">Total Recall Score</span>
                    <span class="result-value ${this.getScoreClass(this.testResults.totalRecallScore, 0, 36)}">${this.testResults.totalRecallScore}/36</span>
                </div>
            </div>
            
            <div class="result-section">
                <h3>Learning Measures</h3>
                <div class="result-item">
                    <span class="result-label">Learning Score</span>
                    <span class="result-value ${this.getScoreClass(this.testResults.learningScore, 0, 12)}">${this.testResults.learningScore}</span>
                </div>
            </div>
            
            <div class="result-section">
                <h3>Delayed Recall</h3>
                <div class="result-item">
                    <span class="result-label">Delayed Recall Score</span>
                    <span class="result-value ${this.getScoreClass(this.testResults.delayedRecallScore, 0, 12)}">${this.testResults.delayedRecallScore}/12</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Retention Score</span>
                    <span class="result-value ${this.getScoreClass(this.testResults.retentionScore, 0, 100)}">${this.testResults.retentionScore}%</span>
                </div>
            </div>
            
            <div class="result-section">
                <h3>Recognition Trial</h3>
                <div class="result-item">
                    <span class="result-label">True Positives (Hits)</span>
                    <span class="result-value">${this.testResults.truePositives}/12</span>
                </div>
                <div class="result-item">
                    <span class="result-label">False Positives</span>
                    <span class="result-value">${this.testResults.falsePositives}/12</span>
                </div>
                <div class="result-item">
                    <span class="result-label">Discrimination Index</span>
                    <span class="result-value ${this.getScoreClass(this.testResults.discriminationIndex, -12, 12)}">${this.testResults.discriminationIndex}</span>
                </div>
            </div>
        `;
    }
    
    getScoreClass(score, min, max) {
        const range = max - min;
        const percentage = ((score - min) / range) * 100;
        if (percentage >= 70) return 'score-high';
        if (percentage >= 40) return 'score-medium';
        return 'score-low';
    }
    
    downloadResults() {
        const results = {
            timestamp: new Date().toISOString(),
            test: 'Hopkins Verbal Learning Test—Revised™ (HVLT-R™)',
            results: this.testResults
        };
        
        // Convert data to XML format
        function jsonToXml(data) {
            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += '<testResult>\n';
            
            // Add test metadata
            xml += `  <testName>${escapeXml(data.test)}</testName>\n`;
            xml += `  <timestamp>${escapeXml(data.timestamp)}</timestamp>\n`;
            
            // Add results
            const r = data.results;
            xml += '  <results>\n';
            
            // Immediate recall trials
            xml += '    <immediateRecall>\n';
            r.immediateRecall.forEach((trial, index) => {
                xml += `      <trial id="${index + 1}">\n`;
                xml += `        <trialNumber>${escapeXml(trial.trial)}</trialNumber>\n`;
                xml += `        <score>${escapeXml(trial.score)}</score>\n`;
                xml += '        <recalledWords>\n';
                trial.recalledWords.forEach((word, wordIndex) => {
                    xml += `          <word index="${wordIndex + 1}">${escapeXml(word)}</word>\n`;
                });
                xml += '        </recalledWords>\n';
                xml += '        <correctWords>\n';
                trial.correctWords.forEach((word, wordIndex) => {
                    xml += `          <word index="${wordIndex + 1}">${escapeXml(word)}</word>\n`;
                });
                xml += '        </correctWords>\n';
                xml += '      </trial>\n';
            });
            xml += '    </immediateRecall>\n';
            
            // Delayed recall
            xml += '    <delayedRecall>\n';
            if (r.delayedRecall && r.delayedRecall.score !== undefined) {
                xml += `      <score>${escapeXml(r.delayedRecall.score)}</score>\n`;
                xml += '      <recalledWords>\n';
                if (r.delayedRecall.recalledWords && Array.isArray(r.delayedRecall.recalledWords)) {
                    r.delayedRecall.recalledWords.forEach((word, index) => {
                        xml += `        <word index="${index + 1}">${escapeXml(word)}</word>\n`;
                    });
                }
                xml += '      </recalledWords>\n';
                xml += '      <correctWords>\n';
                if (r.delayedRecall.correctWords && Array.isArray(r.delayedRecall.correctWords)) {
                    r.delayedRecall.correctWords.forEach((word, index) => {
                        xml += `        <word index="${index + 1}">${escapeXml(word)}</word>\n`;
                    });
                }
                xml += '      </correctWords>\n';
            } else {
                xml += '      <score>0</score>\n';
                xml += '      <recalledWords></recalledWords>\n';
                xml += '      <correctWords></correctWords>\n';
            }
            xml += '    </delayedRecall>\n';
            
            // Recognition
            xml += '    <recognition>\n';
            if (r.recognition && Array.isArray(r.recognition)) {
                r.recognition.forEach((item, index) => {
                    xml += `      <recognitionItem id="${index + 1}">\n`;
                    xml += `        <word>${escapeXml(item.word)}</word>\n`;
                    xml += `        <response>${escapeXml(item.response)}</response>\n`;
                    xml += `        <isTarget>${escapeXml(item.isTarget)}</isTarget>\n`;
                    xml += `        <correct>${escapeXml(item.correct)}</correct>\n`;
                    xml += '      </recognitionItem>\n';
                });
            } else {
                xml += '      <recognitionItem id="1">\n';
                xml += '        <word>No recognition data</word>\n';
                xml += '        <response>N/A</response>\n';
                xml += '        <isTarget>false</isTarget>\n';
                xml += '        <correct>false</correct>\n';
                xml += '      </recognitionItem>\n';
            }
            xml += '    </recognition>\n';
            
            // Summary scores
            xml += '    <summaryScores>\n';
            xml += `      <totalRecallScore>${escapeXml(r.totalRecallScore)}</totalRecallScore>\n`;
            xml += `      <learningScore>${escapeXml(r.learningScore)}</learningScore>\n`;
            xml += `      <delayedRecallScore>${escapeXml(r.delayedRecallScore)}</delayedRecallScore>\n`;
            xml += `      <retentionScore>${escapeXml(r.retentionScore)}</retentionScore>\n`;
            xml += `      <truePositives>${escapeXml(r.truePositives)}</truePositives>\n`;
            xml += `      <falsePositives>${escapeXml(r.falsePositives)}</falsePositives>\n`;
            xml += `      <discriminationIndex>${escapeXml(r.discriminationIndex)}</discriminationIndex>\n`;
            xml += '    </summaryScores>\n';
            
            xml += '  </results>\n';
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
        
        const xmlData = jsonToXml(results);
        const blob = new Blob([xmlData], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HVLT-R_Results_${new Date().toISOString().split('T')[0]}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    restartTest() {
        this.resetTest();
    }
    
    // Utility functions
    showFeedback(elementId, message, type) {
        const feedbackEl = document.getElementById(elementId);
        feedbackEl.textContent = message;
        feedbackEl.className = `feedback ${type}`;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the test when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new HVLTRTest();
});
