// MCCB Analytics Dashboard JavaScript - Clean Version

// ============ GLOBAL FUNCTIONS FOR BUTTON HANDLERS ============
// These must be defined immediately for onclick handlers to work

function selectFolder() {
    console.log('selectFolder called');
    const folderInput = document.getElementById('folderInput');
    if (folderInput) {
        folderInput.click();
    } else {
        console.error('Folder input not found');
    }
}

function autoDetectFolders() {
    console.log('autoDetectFolders called');
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.showUploadStatus('Scanning for test data folders...', 'info');
    analytics.showLoading(true);
    
    // Make an AJAX call to the server to scan folders
    fetch('/run-folder-finder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        analytics.showLoading(false);
        if (data.success) {
            analytics.showUploadStatus(data.message, 'success');
            // Clear existing data and reload the page to show updated data
            analytics.clearAllData();
            // Small delay to show the success message before reloading
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            analytics.showUploadStatus('Error: ' + (data.error || 'Failed to detect folders'), 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        analytics.showLoading(false);
        analytics.showUploadStatus('Error connecting to server: ' + error.message, 'error');
    });
}

function testUpload() {
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.testUpload();
}

function exportData() {
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.exportData();
}

function mergeXMLFiles() {
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.mergeXMLFiles();
}

function clearAllData() {
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.clearAllData();
}

function clearAllDataFolders() {
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.clearAllDataFolders();
}

function updateUserName() {
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.updateUserName();
}

function handleFileInputChange() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) return;
    const selectedFilesInfo = document.getElementById('selectedFilesInfo');
    if (selectedFilesInfo) {
        selectedFilesInfo.textContent = `${fileInput.files.length} file(s) selected`;
    }
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.handleFileSelect({ target: fileInput });
}

function handleFolderInputChange() {
    const folderInput = document.getElementById('folderInput');
    if (folderInput.files.length === 0) return;
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.handleFolderSelect({ target: folderInput });
}

// ============ MAIN MCCB ANALYTICS CLASS ============

class MCCBAnalytics {
    constructor() {
        this.testData = [];
        this.improvementData = []; // Multiple instances of same test over time
        this.completeData = []; // Complete MCCB sessions
        this.charts = {};
        this.userName = '';
        this.loadUserName();
        this.loadSavedData();
    }

    loadSavedData() {
        try {
            const savedData = localStorage.getItem('mccbTestData');
            if (savedData) {
                this.testData = JSON.parse(savedData);
                console.log('Loaded saved test data:', this.testData.length, 'tests');
                this.categorizeData();
                this.updateDashboard();
            }
        } catch (error) {
            console.log('No saved test data found:', error);
        }
    }

    saveTestData() {
        try {
            localStorage.setItem('mccbTestData', JSON.stringify(this.testData));
            console.log('Saved test data:', this.testData.length, 'tests');
        } catch (error) {
            console.log('Error saving test data:', error);
        }
    }

    loadUserName() {
        const savedName = localStorage.getItem('mccbUserName');
        if (savedName) {
            this.userName = savedName;
            const nameInput = document.getElementById('userName');
            if (nameInput) {
                nameInput.value = savedName;
            }
        }
    }

    updateUserName() {
        const nameInput = document.getElementById('userName');
        if (nameInput) {
            this.userName = nameInput.value || 'Anonymous';
            localStorage.setItem('mccbUserName', this.userName);
        }
    }

    // ============ DATA PROCESSING METHODS ============
    
    categorizeData() {
        console.log('=== CATEGORIZING DATA ===');
        console.log('Test data:', this.testData.map(test => ({type: test.type, date: test.date})));
        
        // Reset categorization
        this.improvementData = [];
        this.completeData = [];
        
        // All MCCB test types that should be in a complete session
        const allMCCBTests = [
            'BACS Symbol Coding',
            'Animal Naming', 
            'Trail Making',
            'CPT-IP',
            'WMS-III Spatial Span',
            'Letter-Number Span',
            'HVLT-R',
            'BVMT-R',
            'NAB Mazes'
        ];
        
        // Group data by date/session
        const dataByDate = {};
        this.testData.forEach(test => {
            // Normalize date by removing time component for grouping
            const dateObj = new Date(test.date);
            const dateKey = dateObj.toISOString().split('T')[0]; // Get YYYY-MM-DD format
            if (!dataByDate[dateKey]) {
                dataByDate[dateKey] = [];
            }
            dataByDate[dateKey].push(test);
        });
        
        // Categorize each session
        Object.keys(dataByDate).forEach(date => {
            const sessionData = dataByDate[date];
            const sessionTestTypes = [...new Set(sessionData.map(test => test.type))];
            
            // Check if this is a complete MCCB session (contains all or most MCCB tests)
            const mccbTestCount = sessionTestTypes.filter(type => allMCCBTests.includes(type)).length;
            const isCompleteSession = mccbTestCount >= 7; // Consider complete if 7+ MCCB tests
            
            if (isCompleteSession) {
                // Add to complete dataset
                this.completeData.push({
                    date: date,
                    tests: sessionData,
                    testTypes: sessionTestTypes,
                    completeness: mccbTestCount / allMCCBTests.length
                });
            } else {
                // Add to improvement dataset (individual tests or partial sessions)
                sessionData.forEach(test => {
                    this.improvementData.push(test);
                });
            }
        });
        
        // Always add all tests to improvement data, even if they're part of a complete session
        this.completeData.forEach(session => {
            session.tests.forEach(test => {
                // Create a copy of the test to avoid reference issues
                this.improvementData.push({...test});
            });
        });
        
        // Sort improvement data by test type and date for tracking
        this.improvementData.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type.localeCompare(b.type);
            }
            return new Date(a.date) - new Date(b.date);
        });
        
        // Remove duplicates based on a unique identifier if it exists, or create one
        const uniqueTests = [];
        const seenTests = new Set();
        
        this.improvementData.forEach(test => {
            // Create a unique key for each test using type, date, and timestamp if available
            const testKey = `${test.type}_${test.date}_${test.timestamp || ''}_${JSON.stringify(test.scores || {})}`;
            if (!seenTests.has(testKey)) {
                seenTests.add(testKey);
                uniqueTests.push(test);
            }
        });
        
        this.improvementData = uniqueTests;
        
        console.log('Final categorization results:');
        console.log('Improvement data:', this.improvementData.length, 'unique tests');
        console.log('Complete data:', this.completeData.length, 'sessions');
        console.log('=== END CATEGORIZATION ===');
    }

    // ============ FILE HANDLING METHODS ============
    
    handleFileSelect(event) {
        const files = event.target.files;
        if (files.length === 0) return;
        
        this.showLoading(true);
        this.showUploadStatus(`Processing ${files.length} file(s)...`, 'info');
        
        let processedFiles = 0;
        const validResults = [];
        
        Array.from(files).forEach(file => {
            if (file.type === 'text/xml' || file.name.endsWith('.xml')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const xmlData = this.parseXMLData(e.target.result, file.name);
                        if (xmlData) {
                            validResults.push(xmlData);
                        }
                        processedFiles++;
                        
                        if (processedFiles === files.length) {
                            this.processImportedData(validResults);
                        }
                    } catch (error) {
                        console.error('Error parsing XML:', error);
                        processedFiles++;
                        if (processedFiles === files.length) {
                            this.processImportedData(validResults);
                        }
                    }
                };
                reader.readAsText(file);
            } else {
                processedFiles++;
                if (processedFiles === files.length) {
                    this.processImportedData(validResults);
                }
            }
        });
    }

    handleFolderSelect(event) {
        const files = event.target.files;
        if (files.length === 0) return;
        
        this.showLoading(true);
        this.showUploadStatus(`Processing ${files.length} files from folder...`, 'info');
        
        let processedFiles = 0;
        const validResults = [];
        
        Array.from(files).forEach(file => {
            if (file.name.endsWith('.xml')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const xmlData = this.parseXMLData(e.target.result, file.name);
                        if (xmlData) {
                            validResults.push(xmlData);
                        }
                        processedFiles++;
                        
                        if (processedFiles === files.length) {
                            this.processImportedData(validResults);
                        }
                    } catch (error) {
                        console.error('Error parsing XML:', error);
                        processedFiles++;
                        if (processedFiles === files.length) {
                            this.processImportedData(validResults);
                        }
                    }
                };
                reader.readAsText(file);
            } else {
                processedFiles++;
                if (processedFiles === files.length) {
                    this.processImportedData(validResults);
                }
            }
        });
    }

    processImportedData(validResults) {
        console.log('=== PROCESS IMPORTED DATA ===');
        console.log('validResults:', validResults);
        console.log('validResults.length:', validResults.length);
        
        let totalTestsAdded = 0;
        validResults.forEach((data, index) => {
            console.log(`Processing result ${index + 1}:`, typeof data, Array.isArray(data) ? `Array with ${data.length} items` : 'Single object');
            
            if (Array.isArray(data)) {
                // If data is an array, add each test individually
                data.forEach(testData => {
                    console.log(`Adding test from array: ${testData.testName}`);
                    this.testData.push(testData);
                    totalTestsAdded++;
                });
            } else if (data) {
                // If data is a single test object
                console.log(`Adding single test: ${data.testName}`);
                this.testData.push(data);
                totalTestsAdded++;
            }
        });
        
        console.log(`Total tests added: ${totalTestsAdded}`);
        console.log(`New testData.length: ${this.testData.length}`);
        console.log('=== END PROCESS IMPORTED DATA ===');
        
        this.categorizeData();
        this.updateDashboard();
        this.showLoading(false);
        this.showUploadStatus(`Successfully imported ${this.testData.length} test results`, 'success');
        this.saveTestData(); // Save data to localStorage
    }

    parseXMLData(xmlString, fileName) {
        console.log(`=== PARSING ${fileName} ===`);
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
            
            // Check if this is our exported XML format first
            const exportedTests = xmlDoc.querySelectorAll('MCCB_Exported_Results Test_Results Test');
            if (exportedTests.length > 0) {
                console.log(`Found ${exportedTests.length} exported tests in ${fileName}`);
                const results = [];
                exportedTests.forEach((testElement, index) => {
                    console.log(`Processing exported test ${index + 1} from ${fileName}`);
                    const testData = this.extractTestDataFromExportedElement(testElement, `${fileName}_test_${index + 1}`);
                    if (testData) {
                        results.push(testData);
                        console.log(`Added exported test: ${testData.testName}`);
                    }
                });
                console.log(`Returning ${results.length} exported tests from ${fileName}`);
                return results;
            }
            
            // Check if this is a multi-test XML file (original format)
            const testElements = xmlDoc.querySelectorAll('Test, Test_Result, BACS_Test_Results, HVLT_R_Test_Results, BVMT_R_Test_Results, NAB_Mazes_Test_Results, TMT_Test_Results, Stroop_Test_Results, COWAT_Test_Results, CPT_Test_Results');
            console.log(`Found ${testElements.length} test elements in ${fileName}`);
            
            if (testElements.length > 1) {
                // Multiple tests in one file - parse each one
                const results = [];
                testElements.forEach((testElement, index) => {
                    console.log(`Processing test element ${index + 1} from ${fileName}`);
                    const testData = this.extractTestDataFromElement(testElement, `${fileName}_test_${index + 1}`);
                    if (testData) {
                        results.push(testData);
                        console.log(`Added test: ${testData.testName}`);
                    }
                });
                console.log(`Returning ${results.length} tests from ${fileName}`);
                return results;
            } else {
                // Single test file - use existing logic
                console.log(`Single test file detected: ${fileName}`);
                const testData = this.extractTestDataFromElement(xmlDoc.documentElement, fileName);
                console.log(`Returning single test: ${testData?.testName}`);
                return testData;
            }
        } catch (error) {
            console.error('Error parsing XML:', error);
            return null;
        }
    }

    extractTestDataFromExportedElement(xmlElement, fileName) {
        try {
            // Parse the exported XML format
            const testName = xmlElement.querySelector('Test_Name')?.textContent || 'Unknown Test';
            const testType = xmlElement.querySelector('Test_Type')?.textContent || 'Unknown';
            const date = xmlElement.querySelector('Test_Date')?.textContent || '';
            const timestamp = xmlElement.querySelector('Test_Time')?.textContent || '';
            
            // Parse scores
            const scoresElement = xmlElement.querySelector('Scores');
            const scores = {
                total: parseInt(scoresElement?.querySelector('Total')?.textContent) || 0,
                max: parseInt(scoresElement?.querySelector('Max')?.textContent) || 0,
                percentage: parseFloat(scoresElement?.querySelector('Percentage')?.textContent) || 0
            };

            const accuracy = scoresElement?.querySelector('Accuracy')?.textContent;
            const reactionTime = scoresElement?.querySelector('ReactionTime')?.textContent;
            const totalLearning = scoresElement?.querySelector('TotalLearning')?.textContent;
            const averageLearning = scoresElement?.querySelector('AverageLearning')?.textContent;
            const delayedRecall = scoresElement?.querySelector('DelayedRecall')?.textContent;
            const recognition = scoresElement?.querySelector('Recognition')?.textContent;

            if (accuracy !== null && accuracy !== undefined && accuracy !== '') {
                scores.accuracy = parseFloat(accuracy.toString().replace('%', ''));
            }
            if (reactionTime !== null && reactionTime !== undefined && reactionTime !== '') {
                scores.reactionTime = parseFloat(reactionTime);
            }
            if (totalLearning !== null && totalLearning !== undefined && totalLearning !== '') {
                scores.totalLearning = parseInt(totalLearning);
            }
            if (averageLearning !== null && averageLearning !== undefined && averageLearning !== '') {
                scores.averageLearning = parseFloat(averageLearning);
            }
            if (delayedRecall !== null && delayedRecall !== undefined && delayedRecall !== '') {
                scores.delayedRecall = parseInt(delayedRecall);
            }
            if (recognition !== null && recognition !== undefined && recognition !== '') {
                scores.recognition = parseInt(recognition);
            }
            
            // Parse metadata
            const metadataElement = xmlElement.querySelector('Metadata');
            const metadata = {
                fileName: metadataElement?.querySelector('File_Name')?.textContent || fileName,
                sessionId: metadataElement?.querySelector('Session_ID')?.textContent || ''
            };
            
            const testData = {
                testName,
                type: testType,
                date,
                timestamp,
                scores,
                metadata
            };
            
            console.log('Extracted exported test data:', testData);
            return testData;
            
        } catch (error) {
            console.error('Error extracting exported test data:', error);
            return null;
        }
    }

    extractTestDataFromElement(xmlElement, fileName) {
        // Check for parsing errors
        const parserError = xmlElement.querySelector('parsererror');
        if (parserError) {
            throw new Error('Invalid XML format');
        }

        // Handle both XML formats: camelCase and BACS format
        const testName = xmlElement.querySelector('testName')?.textContent || 
                         xmlElement.querySelector('Test_Name')?.textContent || 
                         xmlElement.querySelector('BACS_Test_Results Test_Info Test_Name')?.textContent || 
                         'Unknown Test';
        
        const timestamp = xmlElement.querySelector('timestamp')?.textContent || 
                          xmlElement.querySelector('Test_Time')?.textContent || '';
        
        const date = xmlElement.querySelector('date')?.textContent || 
                    xmlElement.querySelector('Test_Date')?.textContent || '';

        // Parse different test types
        let testData = {
            testName,
            timestamp,
            date,
            type: this.getTestType(testName),
            scores: {},
            metadata: {}
        };

        // HVLT-R specific parsing
        if (testName.includes('HVLT-R')) {
            testData.scores = this.parseHVLTRScores(xmlElement);
        }
        // BVMT-R specific parsing
        else if (testName.includes('BVMT-R')) {
            testData.scores = this.parseBVMTRScores(xmlElement);
        }
        // NAB Mazes specific parsing
        else if (testName.includes('NAB Mazes')) {
            testData.scores = this.parseNABMazesScores(xmlElement);
        }
        // Letter-Number Span specific parsing
        else if (testName.includes('Letter-Number')) {
            testData.scores = this.parseLetterNumberScores(xmlElement);
        }
        // WMS-III Spatial Span specific parsing
        else if (testName.includes('WMS-III')) {
            testData.scores = this.parseWMSIIIScores(xmlElement);
        }
        // BACS Symbol Coding specific parsing
        else if (testName.includes('BACS Symbol Coding')) {
            testData.scores = this.parseBACSSymbolCodingScores(xmlElement);
        }
        // Animal Naming specific parsing
        else if (testName.includes('Animal Naming')) {
            testData.scores = this.parseAnimalNamingScores(xmlElement);
        }
        // Trail Making specific parsing
        else if (testName.includes('Trail Making')) {
            testData.scores = this.parseTrailMakingScores(xmlElement);
        }
        // CPT-IP specific parsing
        else if (testName.includes('CPT')) {
            testData.scores = this.parseCPTScores(xmlElement);
        }

        return testData;
    }

    getTestType(testName) {
        if (testName.includes('HVLT-R')) return 'HVLT-R';
        if (testName.includes('BVMT-R')) return 'BVMT-R';
        if (testName.includes('NAB Mazes')) return 'NAB Mazes';
        if (testName.includes('Letter-Number')) return 'Letter-Number Span';
        if (testName.includes('WMS-III')) return 'WMS-III Spatial Span';
        if (testName.includes('BACS Symbol Coding')) return 'BACS Symbol Coding';
        if (testName.includes('Animal Naming')) return 'Animal Naming';
        if (testName.includes('Trail Making')) return 'Trail Making';
        if (testName.includes('CPT')) return 'CPT-IP';
        return 'Other';
    }

    parseHVLTRScores(xmlDoc) {
        const scores = {};
        
        // Summary scores
        const totalRecallScore = xmlDoc.querySelector('totalRecallScore')?.textContent;
        const learningScore = xmlDoc.querySelector('learningScore')?.textContent;
        const delayedRecallScore = xmlDoc.querySelector('delayedRecallScore')?.textContent;
        const retentionScore = xmlDoc.querySelector('retentionScore')?.textContent;
        const percentage = xmlDoc.querySelector('percentage')?.textContent;
        
        if (totalRecallScore) scores.totalRecall = parseInt(totalRecallScore);
        if (learningScore) scores.learning = parseInt(learningScore);
        if (delayedRecallScore) scores.delayedRecall = parseInt(delayedRecallScore);
        if (retentionScore) scores.retention = parseFloat(retentionScore.toString().replace('%', ''));
        if (percentage) scores.percentage = parseFloat(percentage.toString().replace('%', ''));

        // Immediate recall trials
        const immediateTrials = xmlDoc.querySelectorAll('immediateRecall trial');
        scores.immediateRecall = [];
        immediateTrials.forEach(trial => {
            const score = trial.querySelector('score')?.textContent;
            if (score) {
                scores.immediateRecall.push(parseInt(score));
            }
        });

        return scores;
    }

    parseBVMTRScores(xmlDoc) {
        const scores = {};
        
        // Summary scores - handle both direct and nested structures
        const totalLearningScore = xmlDoc.querySelector('totalLearningScore')?.textContent || 
                                 xmlDoc.querySelector('Results totalLearningScore')?.textContent;
        const averageLearningScore = xmlDoc.querySelector('averageLearningScore')?.textContent || 
                                   xmlDoc.querySelector('Results averageLearningScore')?.textContent;
        const delayedRecallScore = xmlDoc.querySelector('delayedRecallScore')?.textContent || 
                                xmlDoc.querySelector('Results delayedRecallScore')?.textContent;
        const recognitionScore = xmlDoc.querySelector('recognitionScore')?.textContent || 
                              xmlDoc.querySelector('Results recognitionScore')?.textContent;
        
        if (totalLearningScore) scores.totalLearning = parseInt(totalLearningScore);
        if (averageLearningScore) scores.averageLearning = parseFloat(averageLearningScore);
        if (delayedRecallScore) scores.delayedRecall = parseInt(delayedRecallScore);
        if (recognitionScore) scores.recognition = parseInt(recognitionScore);

        // Learning scores
        const learningTrials = xmlDoc.querySelectorAll('learningScores trial');
        scores.learningTrials = [];
        learningTrials.forEach(trial => {
            const score = trial.querySelector('score')?.textContent;
            if (score) {
                scores.learningTrials.push(parseInt(score));
            }
        });

        return scores;
    }

    parseNABMazesScores(xmlDoc) {
        const scores = {};
        
        // Summary scores
        const totalScore = xmlDoc.querySelector('totalScore')?.textContent;
        const maxScore = xmlDoc.querySelector('maxScore')?.textContent;
        const percentage = xmlDoc.querySelector('percentage')?.textContent;
        
        if (totalScore) scores.total = parseInt(totalScore);
        if (maxScore) scores.max = parseInt(maxScore);
        if (percentage) scores.percentage = parseFloat(percentage.toString().replace('%', ''));

        // Individual maze results
        const mazeResults = xmlDoc.querySelectorAll('mazeResults maze');
        scores.mazes = [];
        mazeResults.forEach(maze => {
            const name = maze.querySelector('name')?.textContent;
            const score = maze.querySelector('score')?.textContent;
            const timeTaken = maze.querySelector('timeTaken')?.textContent;
            const completed = maze.querySelector('completed')?.textContent;
            
            if (name && score) {
                scores.mazes.push({
                    name,
                    score: parseInt(score),
                    timeTaken: parseInt(timeTaken) || 0,
                    completed: completed === 'true'
                });
            }
        });

        return scores;
    }

    parseLetterNumberScores(xmlDoc) {
        const scores = {};
        
        // Summary scores
        const totalScore = xmlDoc.querySelector('totalScore')?.textContent;
        const maxScore = xmlDoc.querySelector('maxScore')?.textContent;
        
        if (totalScore) scores.total = parseInt(totalScore);
        if (maxScore) scores.max = parseInt(maxScore);

        // Trial scores
        const trials = xmlDoc.querySelectorAll('trial');
        scores.trials = [];
        trials.forEach(trial => {
            const trialNumber = trial.querySelector('trialNumber')?.textContent;
            const score = trial.querySelector('score')?.textContent;
            
            if (trialNumber && score) {
                scores.trials.push({
                    trial: parseInt(trialNumber),
                    score: parseInt(score)
                });
            }
        });

        return scores;
    }

    parseWMSIIIScores(xmlDoc) {
        const scores = {};
        
        // Summary scores
        const totalScore = xmlDoc.querySelector('totalScore')?.textContent;
        const maxScore = xmlDoc.querySelector('maxScore')?.textContent;
        
        if (totalScore) scores.total = parseInt(totalScore);
        if (maxScore) scores.max = parseInt(maxScore);

        // Trial scores
        const trials = xmlDoc.querySelectorAll('trial');
        scores.trials = [];
        trials.forEach(trial => {
            const trialNumber = trial.querySelector('trialNumber')?.textContent;
            const score = trial.querySelector('score')?.textContent;
            
            if (trialNumber && score) {
                scores.trials.push({
                    trial: parseInt(trialNumber),
                    score: parseInt(score)
                });
            }
        });

        return scores;
    }

    parseBACSSymbolCodingScores(xmlDoc) {
        const scores = {};
        
        // Handle BACS format (capitalized with underscores)
        const score = xmlDoc.querySelector('Score')?.textContent || 
                     xmlDoc.querySelector('Results Score')?.textContent;
        const maxScore = xmlDoc.querySelector('Max_Score')?.textContent || 
                        xmlDoc.querySelector('Results Max_Score')?.textContent;
        const percentage = xmlDoc.querySelector('Percentage')?.textContent || 
                          xmlDoc.querySelector('Results Percentage')?.textContent;
        const timeTaken = xmlDoc.querySelector('Time_Taken_Seconds')?.textContent || 
                         xmlDoc.querySelector('Results Time_Taken_Seconds')?.textContent;
        const timePerItem = xmlDoc.querySelector('Time_Per_Item')?.textContent || 
                           xmlDoc.querySelector('Results Time_Per_Item')?.textContent;
        
        if (score) scores.score = parseInt(score);
        if (maxScore) scores.maxScore = parseInt(maxScore);
        if (percentage) scores.percentage = parseFloat(percentage.replace('%', ''));
        if (timeTaken) scores.timeTaken = parseInt(timeTaken);
        if (timePerItem) scores.timePerItem = parseFloat(timePerItem);

        return scores;
    }

    parseAnimalNamingScores(xmlDoc) {
        const scores = {};
        
        const score = xmlDoc.querySelector('score')?.textContent;
        const timeTaken = xmlDoc.querySelector('timeTaken')?.textContent;
        const testDuration = xmlDoc.querySelector('testDuration')?.textContent;
        const percentage = xmlDoc.querySelector('percentage')?.textContent;
        
        if (score) scores.score = parseInt(score);
        if (timeTaken) scores.timeTaken = parseInt(timeTaken);
        if (testDuration) scores.testDuration = parseInt(testDuration);
        if (percentage) scores.percentage = parseFloat(percentage.toString().replace('%', ''));
        
        // Count words if available
        const words = xmlDoc.querySelectorAll('word');
        if (words.length > 0) scores.wordCount = words.length;

        return scores;
    }

    parseTrailMakingScores(xmlDoc) {
        const scores = {};
        
        // Try to get the score from various possible XML structures
        const score = xmlDoc.querySelector('score')?.textContent || 
                     xmlDoc.querySelector('Results score')?.textContent ||
                     xmlDoc.querySelector('TMT_Test_Results Results score')?.textContent;
        
        const timeTaken = xmlDoc.querySelector('timeTaken')?.textContent || 
                         xmlDoc.querySelector('Results timeTaken')?.textContent ||
                         xmlDoc.querySelector('TMT_Test_Results Results timeTaken')?.textContent;
        
        const errors = xmlDoc.querySelector('errors')?.textContent || 
                      xmlDoc.querySelector('Results errors')?.textContent ||
                      xmlDoc.querySelector('TMT_Test_Results Results errors')?.textContent;
        
        const percentage = xmlDoc.querySelector('percentage')?.textContent || 
                          xmlDoc.querySelector('Results percentage')?.textContent ||
                          xmlDoc.querySelector('TMT_Test_Results Results percentage')?.textContent;
        
        const completionTime = xmlDoc.querySelector('completionTime')?.textContent || 
                             xmlDoc.querySelector('Results completionTime')?.textContent ||
                             xmlDoc.querySelector('TMT_Test_Results Results completionTime')?.textContent;
        
        // Parse the values, providing default fallbacks
        if (score) scores.score = parseInt(score);
        if (timeTaken) scores.timeTaken = parseInt(timeTaken);
        if (errors) scores.errors = parseInt(errors);
        if (percentage) {
            scores.percentage = parseFloat(percentage.toString().replace('%', ''));
        } else if (scores.score !== undefined) {
            // If no percentage is provided but we have a score, use it as the percentage
            scores.percentage = scores.score;
        }
        if (completionTime) scores.completionTime = parseInt(completionTime);
        
        // If we have completion time but no score, calculate a score based on completion time
        if (scores.completionTime && !scores.score) {
            // This is a simplified calculation - adjust the formula as needed
            // For Trail Making A, lower completion times are better
            // We'll invert the score so higher is better (like a percentage)
            const maxTime = 180; // Maximum expected time in seconds (3 minutes)
            const minTime = 20;  // Minimum expected time in seconds
            let time = Math.min(Math.max(scores.completionTime, minTime), maxTime);
            scores.score = Math.round(100 * (1 - (time - minTime) / (maxTime - minTime)));
            scores.percentage = scores.score; // Set percentage to match the calculated score
        }
        
        console.log('Parsed Trail Making scores:', scores);
        return scores;
    }

    parseCPTScores(xmlDoc) {
        const scores = {};
        
        // Handle both direct and nested XML structures
        const score = xmlDoc.querySelector('score')?.textContent || 
                     xmlDoc.querySelector('Results score')?.textContent;
        const timeTaken = xmlDoc.querySelector('timeTaken')?.textContent || 
                         xmlDoc.querySelector('Results timeTaken')?.textContent;
        const accuracy = xmlDoc.querySelector('accuracy')?.textContent || 
                        xmlDoc.querySelector('Results accuracy')?.textContent;
        const reactionTime = xmlDoc.querySelector('reactionTime')?.textContent || 
                            xmlDoc.querySelector('Results reactionTime')?.textContent;
        
        if (score) scores.score = parseInt(score);
        if (timeTaken) scores.timeTaken = parseInt(timeTaken);
        if (accuracy) scores.accuracy = parseFloat(accuracy.toString().replace('%', ''));
        if (reactionTime) scores.reactionTime = parseFloat(reactionTime);

        return scores;
    }

    // ============ UI UPDATE METHODS ============
    
    updateDashboard() {
        if (this.testData.length === 0) {
            document.getElementById('dataSection').classList.add('hidden');
            return;
        }

        document.getElementById('dataSection').classList.remove('hidden');
        this.updateSummaryCards();
        this.updateCharts();
        this.updateTestList();
        this.updateDatasetViews();
        
        // Save data with user information to backend
        this.saveDataWithUser();
    }

    updateSummaryCards() {
        // Update total tests
        document.getElementById('totalTests').textContent = this.testData.length;
        
        // Update test types
        const uniqueTypes = [...new Set(this.testData.map(test => test.type))];
        document.getElementById('testTypes').textContent = uniqueTypes.length;
        
        // Update date range
        const dates = this.testData.map(test => new Date(test.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        document.getElementById('dateRange').textContent = 
            `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`;
        
        // Update average performance
        const avgScore = this.calculateUnifyingScore();
        const avgElement = document.getElementById('avgPerformance');
        if (avgElement) {
            avgElement.textContent = avgScore > 0 ? avgScore : '-';
        }
    }

    updateCharts() {
        // Update overall analytics (Dataset 3: 1,1,1)
        this.updateUnifyingScore();
        
        // Update time-based analytics (Dataset 1: 1,2,3)
        this.updatePerformanceTimeline();
        this.updateProgressTracking();
        this.updateTestDetails();
        
        // Update test-type analytics (Dataset 2: 1,2,3)
        this.updateTestTypeComparison();
        this.updateTestMetricsGrid();
        this.updateErrorAnalysis();
        
        console.log('All charts updated');
    }

    // Dataset 1: Time-Based Analytics (1,2,3)
    updatePerformanceTimeline() {
        const canvas = document.getElementById('performanceTimeline');
        if (!canvas) return;
        
        if (this.testData.length === 0) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#666';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No data available for Performance Timeline', canvas.width/2, canvas.height/2);
            return;
        }
        
        // Sort data by date
        const sortedData = [...this.testData].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Prepare data for timeline chart
        const labels = sortedData.map(test => {
            const date = new Date(test.date);
            return date.toLocaleDateString() + (test.timestamp ? ' ' + test.timestamp.substring(0, 5) : '');
        });
        
        const scores = sortedData.map(test => {
            return this.getAppropriateScore(test);
        });
        
        const testTypes = sortedData.map(test => test.type);
        
        // Destroy existing chart if it exists
        if (this.charts.performanceTimeline) {
            this.charts.performanceTimeline.destroy();
        }
        
        // Create timeline chart with fixed aspect ratio
        const ctx = canvas.getContext('2d');
        
        // Set fixed canvas dimensions to prevent endless stretching
        canvas.style.height = '400px';
        canvas.style.maxHeight = '400px';
        
        this.charts.performanceTimeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Performance Score',
                    data: scores,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 2, // Fixed aspect ratio to prevent stretching
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance Timeline - All Tests Over Time',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                return 'Test: ' + testTypes[context.dataIndex];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Performance Score'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date/Time'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            autoSkip: true,
                            maxTicksLimit: 10 // Limit number of x-axis labels
                        }
                    }
                }
            }
        });
    }

    updateProgressTracking() {
        const canvas = document.getElementById('progressTracking');
        if (!canvas) return;
        
        if (this.improvementData.length === 0) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#666';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No improvement data available for Progress Tracking', canvas.width/2, canvas.height/2);
            return;
        }
        
        // Group improvement data by test type to track progress over time
        const dataByTestType = {};
        this.improvementData.forEach(test => {
            if (!dataByTestType[test.type]) {
                dataByTestType[test.type] = [];
            }
            dataByTestType[test.type].push({
                date: test.date,
                score: this.getAppropriateScore(test),
                timestamp: test.timestamp
            });
        });
        
        // Calculate improvement trends for each test type
        const improvementTrends = {};
        Object.keys(dataByTestType).forEach(testType => {
            const testScores = dataByTestType[testType].sort((a, b) => new Date(a.date) - new Date(b.date));
            
            if (testScores.length >= 2) {
                const firstScore = testScores[0].score;
                const lastScore = testScores[testScores.length - 1].score;
                const improvement = lastScore - firstScore;
                const improvementPercent = firstScore > 0 ? ((improvement / firstScore) * 100) : 0;
                
                improvementTrends[testType] = {
                    firstScore: firstScore,
                    lastScore: lastScore,
                    improvement: improvement,
                    improvementPercent: improvementPercent,
                    testCount: testScores.length,
                    scores: testScores
                };
            }
        });
        
        // Prepare data for progress tracking chart
        const testTypeNames = Object.keys(improvementTrends);
        const improvementData = testTypeNames.map(type => improvementTrends[type].improvementPercent);
        const firstScores = testTypeNames.map(type => improvementTrends[type].firstScore);
        const lastScores = testTypeNames.map(type => improvementTrends[type].lastScore);
        
        // Destroy existing chart if it exists
        if (this.charts.progressTracking) {
            this.charts.progressTracking.destroy();
        }
        
        // Create improvement chart
        const ctx = canvas.getContext('2d');
        this.charts.progressTracking = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: testTypeNames,
                datasets: [
                    {
                        label: 'First Score',
                        data: firstScores,
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        borderColor: 'rgb(255, 99, 132)',
                        borderWidth: 1
                    },
                    {
                        label: 'Last Score',
                        data: lastScores,
                        backgroundColor: 'rgba(75, 192, 192, 0.7)',
                        borderColor: 'rgb(75, 192, 192)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Progress Tracking - Improvement Over Time',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const testType = testTypeNames[context.dataIndex];
                                const trend = improvementTrends[testType];
                                return `Improvement: ${trend.improvementPercent.toFixed(1)}% (${trend.testCount} tests)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Performance Score'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Test Type'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
        
        // Add detailed progress analysis below the chart
        const progressDetailsDiv = document.getElementById('progressDetails');
        if (progressDetailsDiv) {
            let detailsHTML = '<h4>Improvement Analysis Details:</h4>';
            
            if (testTypeNames.length > 0) {
                detailsHTML += '<table style="width: 100%; border-collapse: collapse;">';
                detailsHTML += '<tr style="background: #f0f0f0;"><th>Test Type</th><th>First Score</th><th>Last Score</th><th>Improvement</th><th>Tests</th></tr>';
                
                testTypeNames.forEach(type => {
                    const trend = improvementTrends[type];
                    const improvementColor = trend.improvement >= 0 ? 'green' : 'red';
                    detailsHTML += `<tr>
                        <td>${type}</td>
                        <td>${trend.firstScore.toFixed(1)}</td>
                        <td>${trend.lastScore.toFixed(1)}</td>
                        <td style="color: ${improvementColor};">${trend.improvementPercent.toFixed(1)}%</td>
                        <td>${trend.testCount}</td>
                    </tr>`;
                });
                
                detailsHTML += '</table>';
                
                // Calculate overall improvement trend
                const overallImprovement = improvementData.reduce((sum, imp) => sum + imp, 0) / improvementData.length;
                detailsHTML += `<p><strong>Overall Improvement Trend:</strong> ${overallImprovement.toFixed(1)}% average improvement across test types.</p>`;
            } else {
                detailsHTML += '<p>No improvement data available (need at least 2 instances of the same test type).</p>';
            }
            
            progressDetailsDiv.innerHTML = detailsHTML;
        }
    }

    updateTestDetails() {
        const testListElement = document.getElementById('testList');
        if (!testListElement) return;
        
        // Currently implemented - shows individual test details
        this.updateTestList();
    }

    // Dataset 2: Test-Type Analytics (1,2,3)
    updateTestTypeComparison() {
        const canvas = document.getElementById('testTypeComparison');
        if (!canvas) return;
        
        if (this.testData.length === 0) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#666';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No data available for Test Type Comparison', canvas.width/2, canvas.height/2);
            return;
        }
        
        // Group data by test type
        const dataByTestType = {};
        this.testData.forEach(test => {
            if (!dataByTestType[test.type]) {
                dataByTestType[test.type] = [];
            }
            dataByTestType[test.type].push(this.getAppropriateScore(test));
        });
        
        // Calculate average scores for each test type
        const testTypeNames = Object.keys(dataByTestType);
        const averageScores = testTypeNames.map(type => {
            const scores = dataByTestType[type];
            return scores.reduce((sum, score) => sum + score, 0) / scores.length;
        });
        
        const testCounts = testTypeNames.map(type => dataByTestType[type].length);
        
        // Destroy existing chart if it exists
        if (this.charts.testTypeComparison) {
            this.charts.testTypeComparison.destroy();
        }
        
        // Create bar chart for test type comparison
        const ctx = canvas.getContext('2d');
        this.charts.testTypeComparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: testTypeNames,
                datasets: [{
                    label: 'Average Performance Score',
                    data: averageScores,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(199, 199, 199, 0.7)',
                        'rgba(83, 102, 255, 0.7)',
                        'rgba(255, 99, 255, 0.7)',
                        'rgba(99, 255, 132, 0.7)'
                    ],
                    borderColor: [
                        'rgb(255, 99, 132)',
                        'rgb(54, 162, 235)',
                        'rgb(255, 206, 86)',
                        'rgb(75, 192, 192)',
                        'rgb(153, 102, 255)',
                        'rgb(255, 159, 64)',
                        'rgb(199, 199, 199)',
                        'rgb(83, 102, 255)',
                        'rgb(255, 99, 255)',
                        'rgb(99, 255, 132)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance by Test Type - Average Scores',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                return `Test Count: ${testCounts[context.dataIndex]}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Average Performance Score'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Test Type'
                        },
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }

    updateTestMetricsGrid() {
        const metricsGrid = document.getElementById('testMetricsGrid');
        if (!metricsGrid) return;
        
        if (this.testData.length === 0) {
            metricsGrid.innerHTML = '<p style="text-align: center; color: #666;">No test data available for Test-by-Test Breakdown</p>';
            return;
        }
        
        // Group data by test type for detailed metrics
        const dataByTestType = {};
        this.testData.forEach(test => {
            if (!dataByTestType[test.type]) {
                dataByTestType[test.type] = {
                    tests: [],
                    scores: [],
                    dates: []
                };
            }
            const score = this.getAppropriateScore(test);
            dataByTestType[test.type].tests.push(test);
            dataByTestType[test.type].scores.push(score);
            dataByTestType[test.type].dates.push(test.date);
        });
        
        // Calculate detailed metrics for each test type
        const testMetrics = {};
        Object.keys(dataByTestType).forEach(testType => {
            const scores = dataByTestType[testType].scores;
            const tests = dataByTestType[testType].tests;
            
            const sortedScores = [...scores].sort((a, b) => a - b);
            const min = sortedScores[0];
            const max = sortedScores[sortedScores.length - 1];
            const median = sortedScores.length % 2 === 0
                ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
                : sortedScores[Math.floor(sortedScores.length / 2)];
            const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
            const stdDev = Math.sqrt(scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length);
            
            // Calculate trend if multiple tests
            let trend = 'N/A';
            let trendValue = 0;
            if (scores.length >= 2) {
                const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
                const secondHalf = scores.slice(Math.floor(scores.length / 2));
                const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
                const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
                trendValue = secondAvg - firstAvg;
                trend = trendValue > 5 ? 'Improving' : trendValue < -5 ? 'Declining' : 'Stable';
            }
            
            testMetrics[testType] = {
                count: scores.length,
                min: min,
                max: max,
                mean: mean,
                median: median,
                stdDev: stdDev,
                trend: trend,
                trendValue: trendValue,
                latestScore: scores[scores.length - 1],
                bestScore: max,
                worstScore: min
            };
        });
        
        // Create detailed metrics table
        let html = '<h3>Test-by-Test Breakdown - Detailed Metrics</h3>';
        html += '<div style="overflow-x: auto;">';
        html += '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
        html += '<thead style="background: #f0f0f0; position: sticky; top: 0;">';
        html += '<tr><th>Test Type</th><th>Count</th><th>Mean</th><th>Median</th><th>Min</th><th>Max</th><th>Std Dev</th><th>Trend</th><th>Latest</th><th>Best</th></tr>';
        html += '</thead><tbody>';
        
        Object.keys(testMetrics).forEach(testType => {
            const metrics = testMetrics[testType];
            const trendColor = metrics.trendValue > 5 ? 'green' : metrics.trendValue < -5 ? 'red' : 'gray';
            
            html += `<tr style="border-bottom: 1px solid #ddd;">
                <td style="font-weight: bold;">${testType}</td>
                <td>${metrics.count}</td>
                <td>${metrics.mean.toFixed(1)}</td>
                <td>${metrics.median.toFixed(1)}</td>
                <td>${metrics.min.toFixed(1)}</td>
                <td>${metrics.max.toFixed(1)}</td>
                <td>${metrics.stdDev.toFixed(1)}</td>
                <td style="color: ${trendColor}; font-weight: bold;">${metrics.trend}</td>
                <td>${metrics.latestScore.toFixed(1)}</td>
                <td>${metrics.bestScore.toFixed(1)}</td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        
        // Add summary statistics
        html += '<div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px;">';
        html += '<h4>Summary Statistics:</h4>';
        
        const totalTests = this.testData.length;
        const uniqueTestTypes = Object.keys(testMetrics).length;
        const allScores = this.testData.map(test => this.getAppropriateScore(test));
        const overallMean = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
        const improvingTests = Object.values(testMetrics).filter(m => m.trend === 'Improving').length;
        const decliningTests = Object.values(testMetrics).filter(m => m.trend === 'Declining').length;
        const stableTests = Object.values(testMetrics).filter(m => m.trend === 'Stable').length;
        
        html += `<p><strong>Total Tests:</strong> ${totalTests} | <strong>Test Types:</strong> ${uniqueTestTypes} | <strong>Overall Average:</strong> ${overallMean.toFixed(1)}</p>`;
        html += `<p><strong>Trends:</strong> ${improvingTests} improving, ${decliningTests} declining, ${stableTests} stable</p>`;
        html += '</div>';
        
        metricsGrid.innerHTML = html;
    }

    updateErrorAnalysis() {
        const canvas = document.getElementById('errorAnalysis');
        if (!canvas) return;
        
        if (this.testData.length === 0) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#666';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No data available for Error Analysis', canvas.width/2, canvas.height/2);
            return;
        }
        
        // Analyze failed attempts and low scores
        const failedAttempts = this.testData.filter(test => {
            const score = this.getAppropriateScore(test);
            return score === 0 || score < 20; // Consider <20% as failed/very poor
        });
        
        const lowScores = this.testData.filter(test => {
            const score = this.getAppropriateScore(test);
            return score >= 20 && score < 50; // 20-50% as low performance
        });
        
        const goodScores = this.testData.filter(test => {
            const score = this.getAppropriateScore(test);
            return score >= 50; // 50%+ as acceptable/good
        });
        
        // Group failures by test type
        const failuresByType = {};
        failedAttempts.forEach(test => {
            if (!failuresByType[test.type]) {
                failuresByType[test.type] = 0;
            }
            failuresByType[test.type]++;
        });
        
        // Prepare data for error analysis chart
        const labels = ['Failed (0-19%)', 'Low Performance (20-49%)', 'Acceptable (50%+)'];
        const data = [failedAttempts.length, lowScores.length, goodScores.length];
        
        // Destroy existing chart if it exists
        if (this.charts.errorAnalysis) {
            this.charts.errorAnalysis.destroy();
        }
        
        // Create pie chart for error analysis
        const ctx = canvas.getContext('2d');
        this.charts.errorAnalysis = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',  // Red for failures
                        'rgba(255, 159, 64, 0.8)',   // Orange for low performance
                        'rgba(75, 192, 192, 0.8)'    // Green for acceptable
                    ],
                    borderColor: [
                        'rgb(255, 99, 132)',
                        'rgb(255, 159, 64)',
                        'rgb(75, 192, 192)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Error Analysis & Failed Attempts',
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const total = data.reduce((sum, val) => sum + val, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${percentage}% of total tests`;
                            }
                        }
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // Add detailed failure analysis below the chart
        const errorDetailsDiv = document.getElementById('errorDetails');
        if (errorDetailsDiv) {
            let detailsHTML = '<h4>Failure Analysis Details:</h4>';
            
            if (Object.keys(failuresByType).length > 0) {
                detailsHTML += '<p><strong>Failed attempts by test type:</strong></p><ul>';
                Object.keys(failuresByType).forEach(type => {
                    detailsHTML += `<li>${type}: ${failuresByType[type]} failed attempts</li>`;
                });
                detailsHTML += '</ul>';
            } else {
                detailsHTML += '<p>No failed attempts recorded.</p>';
            }
            
            detailsHTML += `<p><strong>Summary:</strong> ${failedAttempts.length} failed, ${lowScores.length} low performance, ${goodScores.length} acceptable performance out of ${this.testData.length} total tests.</p>`;
            
            errorDetailsDiv.innerHTML = detailsHTML;
        }
    }

    updateUnifyingScore() {
        const score = this.calculateUnifyingScore();
        const scoreElement = document.getElementById('unifyingScore');
        const interpretationElement = document.getElementById('scoreInterpretation');
        
        if (scoreElement) {
            scoreElement.textContent = score;
        }
        
        if (interpretationElement) {
            interpretationElement.textContent = this.getScoreInterpretation(score);
        }
        }

    calculateUnifyingScore() {
        if (this.testData.length === 0) return 0;
        
        console.log('All test data:', this.testData.map(test => ({
            type: test.type,
            scores: test.scores,
            date: test.date
        })));
        
        console.log('Improvement data:', this.improvementData.map(test => ({
            type: test.type,
            scores: test.scores,
            date: test.date
        })));
        
        // Use improvement data if available, otherwise use all test data
        const dataToUse = this.improvementData.length > 0 ? this.improvementData : this.testData;
        
        console.log('Using data for calculation:', dataToUse.length, 'tests');
        
        // Calculate simple average of all scores
        if (dataToUse.length > 0) {
            const allScores = dataToUse.map(test => {
                const score = this.getAppropriateScore(test);
                console.log(`Test: ${test.type}, Score: ${score}`);
                return score;
            });
            
            if (allScores.length > 0) {
                const simpleAverage = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
                console.log('Score calculation:', {
                    scores: allScores,
                    average: simpleAverage.toFixed(1)
                });
                
                return Math.round(simpleAverage);
            } else {
                console.log('No valid scores found');
                return 0;
            }
        }
        
        console.log('No data available for calculation');
        return 0;
    }

    getAppropriateScore(test) {
        console.log('Getting score for test:', test.type, 'with scores:', test.scores);
        
        // Special handling for BACS Symbol Coding - normalize to 50-range as normal
        if (test.type.includes('BACS Symbol Coding')) {
            // For BACS, normalize the percentage so that ~50% becomes the new normal
            if (test.scores?.percentage) {
                // Map: 0-30% -> 0-60%, 30-50% -> 60-80%, 50-100% -> 80-100%
                let normalizedScore;
                const originalScore = test.scores.percentage;
                
                if (originalScore <= 30) {
                    normalizedScore = (originalScore / 30) * 60; // 0-30% maps to 0-60%
                } else if (originalScore <= 50) {
                    normalizedScore = 60 + ((originalScore - 30) / 20) * 20; // 30-50% maps to 60-80%
                } else {
                    normalizedScore = 80 + ((originalScore - 50) / 50) * 20; // 50-100% maps to 80-100%
                }
                
                console.log('BACS normalized score:', originalScore, '->', normalizedScore);
                return Math.min(normalizedScore, 100);
            }
        }
        
        // Use percentage for most tests - this is primary score field
        if (test.scores?.percentage) {
            const percentage = parseFloat(test.scores.percentage.toString().replace('%', ''));
            console.log('Using percentage score:', percentage);
            return percentage;
        }
        
        // For tests without percentage, try accuracy
        if (test.scores?.accuracy) {
            const accuracy = parseFloat(test.scores.accuracy.toString().replace('%', ''));
            console.log('Using accuracy score:', accuracy);
            return accuracy;
        }
        
        // For raw score tests, use total score and convert to percentage if possible
        if (test.scores?.total && test.scores?.max) {
            const percentage = (test.scores.total / test.scores.max) * 100;
            console.log('Calculated percentage from total/max:', percentage);
            return percentage;
        }
        
        // Fallback to raw scores for specific tests
        if (test.scores?.total) {
            console.log('Using total score:', test.scores.total);
            return test.scores.total;
        }
        
        // Handle Animal Naming specific score field
        if (test.type.includes('Animal Naming') && test.scores?.score) {
            console.log('Using Animal Naming score:', test.scores.score);
            return test.scores.score;
        }
        
        // Handle Trail Making specific score field
        if (test.type.includes('Trail Making') && test.scores?.percentage) {
            console.log('Using Trail Making percentage score:', test.scores.percentage);
            return parseFloat(test.scores.percentage.toString().replace('%', ''));
        }
        
        // Handle BVMT-R specific score field
        if (test.type.includes('BVMT-R') && test.scores?.totalLearning) {
            console.log('Using BVMT-R total learning score:', test.scores.totalLearning);
            return test.scores.totalLearning;
        }
        
        // Handle CPT-IP specific score field
        if (test.type.includes('CPT-IP') && test.scores?.accuracy) {
            console.log('Using CPT-IP accuracy score:', test.scores.accuracy);
            return parseFloat(test.scores.accuracy.toString().replace('%', ''));
        }
        
        console.log('No valid score found for test:', test.type);
        return 0;
    }

    getScoreType(test) {
        const rawScoreTests = [
            'BACS Symbol Coding Test',
            'BACS Symbol Coding'
        ];
        
        if (rawScoreTests.some(name => test.type.includes(name))) {
            return 'Raw Score';
        }
        return 'Percentage';
    }
    
    getScoreInterpretation(score) {
        if (score >= 85) return "Excellent performance - Outstanding cognitive function";
        if (score >= 75) return "Very good performance - Above average cognitive function";
        if (score >= 65) return "Good performance - Average cognitive function";
        if (score >= 55) return "Fair performance - Mildly below average cognitive function";
        if (score >= 45) return "Poor performance - Moderately impaired cognitive function";
        return "Very poor performance - Severely impaired cognitive function";
    }

    updateTestList() {
        const testListDiv = document.getElementById('testList');
        if (!testListDiv) return;
        
        if (this.testData.length === 0) {
            testListDiv.innerHTML = '<p>No test data available</p>';
            return;
        }
        
        // Update filter options
        this.updateTestTypeFilter();
        
        // Apply filters and sorting
        const filteredTests = this.getFilteredAndSortedTests();
        
        // Update summary statistics
        this.updateDetailsSummary(filteredTests);
        
        // Display tests
        this.displayTestList(filteredTests);
    }
    
    updateTestTypeFilter() {
        const filterSelect = document.getElementById('testTypeFilter');
        if (!filterSelect) return;
        
        // Get unique test types
        const uniqueTypes = [...new Set(this.testData.map(test => test.type))];
        
        // Update filter options
        filterSelect.innerHTML = '<option value="all">All Tests</option>';
        uniqueTypes.forEach(type => {
            filterSelect.innerHTML += `<option value="${type}">${type}</option>`;
        });
    }
    
    getFilteredAndSortedTests() {
        let filteredTests = [...this.testData];
        
        // Apply test type filter
        const testTypeFilter = document.getElementById('testTypeFilter')?.value;
        if (testTypeFilter && testTypeFilter !== 'all') {
            filteredTests = filteredTests.filter(test => test.type === testTypeFilter);
        }
        
        // Apply sorting
        const sortBy = document.getElementById('testSortBy')?.value || 'date-desc';
        
        switch (sortBy) {
            case 'date-desc':
                filteredTests.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'date-asc':
                filteredTests.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'score-desc':
                filteredTests.sort((a, b) => this.getAppropriateScore(b) - this.getAppropriateScore(a));
                break;
            case 'score-asc':
                filteredTests.sort((a, b) => this.getAppropriateScore(a) - this.getAppropriateScore(b));
                break;
            case 'type':
                filteredTests.sort((a, b) => a.type.localeCompare(b.type));
                break;
        }
        
        return filteredTests;
    }
    
    updateDetailsSummary(filteredTests) {
        const summaryDiv = document.getElementById('detailsSummary');
        if (!summaryDiv) return;
        
        if (filteredTests.length === 0) {
            summaryDiv.innerHTML = '<p>No tests match current filters</p>';
            return;
        }
        
        const scores = filteredTests.map(test => this.getAppropriateScore(test));
        const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        
        // Group by test type
        const typeCounts = {};
        filteredTests.forEach(test => {
            typeCounts[test.type] = (typeCounts[test.type] || 0) + 1;
        });
        
        let summaryHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">`;
        summaryHTML += `<div><strong>Tests Shown:</strong> ${filteredTests.length}</div>`;
        summaryHTML += `<div><strong>Average Score:</strong> ${avgScore.toFixed(1)}</div>`;
        summaryHTML += `<div><strong>Highest Score:</strong> ${maxScore.toFixed(1)}</div>`;
        summaryHTML += `<div><strong>Lowest Score:</strong> ${minScore.toFixed(1)}</div>`;
        summaryHTML += `</div>`;
        
        summaryHTML += '<div style="margin-top: 10px;"><strong>Test Types:</strong> ';
        summaryHTML += Object.keys(typeCounts).map(type => `${type} (${typeCounts[type]})`).join(', ');
        summaryHTML += '</div>';
        
        summaryDiv.innerHTML = summaryHTML;
    }
    
    displayTestList(tests) {
        const testListDiv = document.getElementById('testList');
        if (!testListDiv) return;
        
        if (tests.length === 0) {
            testListDiv.innerHTML = '<p>No tests match current filters</p>';
            return;
        }
        
        let html = '<div class="test-grid">';
        
        tests.forEach((test, index) => {
            const score = this.getAppropriateScore(test);
            const scoreType = this.getScoreType(test);
            const percentage = test.scores?.percentage ? `${test.scores.percentage}%` : '';
            const maxScore = test.scores?.max ? `/${test.scores.max}` : '';
            
            // Determine performance color
            let performanceColor = '#28a745'; // Green for good
            if (score < 20) {
                performanceColor = '#dc3545'; // Red for poor
            } else if (score < 50) {
                performanceColor = '#ffc107'; // Yellow for fair
            }
            
            html += `<div class="test-card" style="border-left: 4px solid ${performanceColor};">
                <div class="test-header">
                    <h5>${test.testName}</h5>
                    <span class="test-type-badge">${test.type}</span>
                </div>
                <div class="test-metrics">
                    <div class="primary-score">${score.toFixed(1)}</div>
                    <div class="score-details">${scoreType}${maxScore} ${percentage}</div>
                </div>
                <div class="test-info">
                    <div class="test-date">${test.date}</div>
                    <div class="test-time">${test.timestamp || ''}</div>
                </div>
                <div class="test-performance" style="color: ${performanceColor};">
                    ${this.getPerformanceLabel(score)}
                </div>
            </div>`;
        });
        
        html += '</div>';
        
        testListDiv.innerHTML = html;
    }
    
    getPerformanceLabel(score) {
        if (score >= 85) return 'Excellent';
        if (score >= 75) return 'Very Good';
        if (score >= 65) return 'Good';
        if (score >= 45) return 'Fair';
        if (score >= 25) return 'Poor';
        return 'Very Poor';
    }

    updateDatasetViews() {
        // Update improvement tracking section
        this.updateImprovementTrackingView();
        
        // Update complete MCCB sessions section  
        this.updateCompleteSessionsView();
    }
    
    updateImprovementTrackingView() {
        const improvementSection = document.getElementById('improvementSection');
        if (!improvementSection) return;
        
        if (this.improvementData.length === 0) {
            improvementSection.innerHTML = '<p>No improvement tracking data available</p>';
            return;
        }
        
        // Group improvement data by test type
        const dataByTestType = {};
        this.improvementData.forEach(test => {
            if (!dataByTestType[test.type]) {
                dataByTestType[test.type] = [];
            }
            dataByTestType[test.type].push(test);
        });
        
        let html = '<h3>Improvement Tracking</h3>';
        
        Object.keys(dataByTestType).forEach((testType, index) => {
            const testData = dataByTestType[testType];
            
            html += `<div class="test-type-section">
                <h4>${testType} (${testData.length} tests)</h4>
                <div class="improvement-graph-container">
                    <canvas id="improvementChart_${index}" width="400" height="200"></canvas>
                </div>
                <div class="test-list">`;
            
            testData.forEach(test => {
                const score = this.getAppropriateScore(test);
                const displayScore = Number.isInteger(score) ? score : score.toFixed(1);
                html += `<div class="test-item">
                    <span class="test-date">${test.date}</span>
                    <span class="test-score">Score: ${displayScore}</span>
                    <span class="test-time">${test.timestamp || ''}</span>
                </div>`;
            });
            
            html += '</div></div>';
        });
        
        improvementSection.innerHTML = html;
        
        // Create charts for each test type
        Object.keys(dataByTestType).forEach((testType, index) => {
            this.createImprovementChart(`improvementChart_${index}`, testType, dataByTestType[testType]);
        });
    }

    createImprovementChart(canvasId, testType, testData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        // Sort data by date
        const sortedData = testData.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Prepare data for chart
        const labels = sortedData.map(test => {
            const date = new Date(test.date);
            return date.toLocaleDateString() + (test.timestamp ? ' ' + test.timestamp : '');
        });
        
        const scores = sortedData.map(test => {
            return this.getAppropriateScore(test);
        });
        
        // Destroy existing chart if it exists
        if (this.charts[canvasId]) {
            this.charts[canvasId].destroy();
        }
        
        // Create new chart
        const ctx = canvas.getContext('2d');
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: testType,
                    data: scores,
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${testType} Performance Over Time`
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Score (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date/Time'
                        }
                    }
                }
            }
        });
    }
    
    updateCompleteSessionsView() {
        const completeSection = document.getElementById('completeSection');
        if (!completeSection) return;
        
        if (this.completeData.length === 0) {
            completeSection.innerHTML = '<p>No complete MCCB sessions available</p>';
            return;
        }
        
        let html = '<h3>Complete MCCB Sessions</h3>';
        this.completeData.forEach(session => {
            const completeness = Math.round(session.completeness * 100);
            html += `<div class="session-section">
                <h4>Session - ${session.date} (${completeness}% Complete)</h4>
                <div class="session-tests">
                    <p>Tests: ${session.testTypes.join(', ')}</p>
                    <div class="test-grid">`;
            
            session.tests.forEach(test => {
                const score = this.getAppropriateScore(test);
                const scoreDisplay = score > 0 ? score.toFixed(1) : 'N/A';
                html += `<div class="test-card">
                    <h5>${test.type}</h5>
                    <p>Score: ${scoreDisplay}</p>
                    <small>${test.timestamp || ''}</small>
                </div>`;
            });
            
            html += '</div></div></div>';
        });
        
        completeSection.innerHTML = html;
    }

    // ============ UTILITY METHODS ============
    
    showUploadStatus(message, type) {
        const statusDiv = document.getElementById('uploadStatus');
        if (!statusDiv) return;
        
        const color = type === 'error' ? 'red' : type === 'warning' ? 'orange' : 'green';
        statusDiv.innerHTML = `<div style="color: ${color}; margin-top: 10px; white-space: pre-line;">${message}</div>`;
        
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 8000);
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            if (show) {
                loadingIndicator.classList.remove('hidden');
            } else {
                loadingIndicator.classList.add('hidden');
            }
        }
    }

    escapeXml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe
            .toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    saveDataWithUser() {
        // Save data to backend
        const dataToSave = {
            userName: this.userName,
            testData: this.testData,
            timestamp: new Date().toISOString()
        };
        
        fetch('http://localhost:8001/save-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSave)
        }).catch(error => {
            console.log('Could not save data to backend:', error);
        });
    }

    // ============ BUTTON ACTION METHODS ============
    
    testUpload() {
        // Sample XML content for testing
        const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<BACS_Test_Results>
    <Test_Info>
        <Test_Name>BACS Symbol Coding Test</Test_Name>
        <Test_Date>2025-12-25</Test_Date>
        <Test_Time>15:30:00</Test_Time>
    </Test_Info>
    <Results>
        <Score>45</Score>
        <Max_Score>150</Max_Score>
        <Percentage>30.00%</Percentage>
    </Results>
</BACS_Test_Results>`;
        
        const testData = this.parseXMLData(sampleXML, 'sample_test.xml');
        if (testData) {
            this.testData.push(testData);
            this.categorizeData();
            this.updateDashboard();
            this.showUploadStatus('Sample test data loaded successfully', 'success');
        }
    }

    exportData() {
        if (this.testData.length === 0) {
            this.showUploadStatus('No data to export', 'warning');
            return;
        }
        
        let mergedXML = `<?xml version="1.0" encoding="UTF-8"?>
<MCCB_Exported_Results>
    <Session_Info>
        <User_Name>${this.escapeXml(this.userName || 'Anonymous')}</User_Name>
        <Export_Date>${new Date().toISOString()}</Export_Date>
        <Total_Tests>${this.testData.length}</Total_Tests>
        <Improvement_Sessions>${this.improvementData.length}</Improvement_Sessions>
        <Complete_Sessions>${this.completeData.length}</Complete_Sessions>
    </Session_Info>
    <Test_Results>`;
        
        this.testData.forEach(test => {
            const total = (test.scores && test.scores.total !== undefined && test.scores.total !== null)
                ? test.scores.total
                : 0;
            const max = (test.scores && test.scores.max !== undefined && test.scores.max !== null)
                ? test.scores.max
                : 0;
            const percentage = (test.scores && test.scores.percentage !== undefined && test.scores.percentage !== null)
                ? test.scores.percentage
                : 0;

            mergedXML += `
        <Test>
            <Test_Name>${this.escapeXml(test.testName)}</Test_Name>
            <Test_Type>${this.escapeXml(test.type || 'Unknown')}</Test_Type>
            <Test_Date>${this.escapeXml(test.date)}</Test_Date>
            <Test_Time>${this.escapeXml(test.timestamp || '')}</Test_Time>
            <Scores>
                <Total>${this.escapeXml(total)}</Total>
                <Max>${this.escapeXml(max)}</Max>
                <Percentage>${this.escapeXml(percentage)}</Percentage>
                <Accuracy>${this.escapeXml(test.scores?.accuracy ?? '')}</Accuracy>
                <ReactionTime>${this.escapeXml(test.scores?.reactionTime ?? '')}</ReactionTime>
                <TotalLearning>${this.escapeXml(test.scores?.totalLearning ?? '')}</TotalLearning>
                <AverageLearning>${this.escapeXml(test.scores?.averageLearning ?? '')}</AverageLearning>
                <DelayedRecall>${this.escapeXml(test.scores?.delayedRecall ?? '')}</DelayedRecall>
                <Recognition>${this.escapeXml(test.scores?.recognition ?? '')}</Recognition>
            </Scores>
            <Metadata>
                <File_Name>${this.escapeXml(test.metadata?.fileName || 'Unknown')}</File_Name>
                <Session_ID>${this.escapeXml(test.metadata?.sessionId || '')}</Session_ID>
            </Metadata>
        </Test>`;
        });
        
        mergedXML += `
    </Test_Results>
    <Improvement_Data>`;
        
        this.improvementData.forEach(session => {
            mergedXML += `
        <Improvement_Session>
            <Test_Type>${session.type || 'Unknown'}</Test_Type>
            <Test_Count>${session.tests?.length || 0}</Test_Count>
            <Date_Range>${session.dateRange || ''}</Date_Range>
            <Trend>${session.trend || 'Unknown'}</Trend>
        </Improvement_Session>`;
        });
        
        mergedXML += `
    </Improvement_Data>
    <Complete_Sessions>`;
        
        this.completeData.forEach(session => {
            mergedXML += `
        <Complete_Session>
            <Session_Date>${session.date || ''}</Session_Date>
            <Test_Count>${session.tests?.length || 0}</Test_Count>
            <Average_Score>${session.averageScore || 0}</Average_Score>
        </Complete_Session>`;
        });
        
        mergedXML += `
    </Complete_Sessions>
</MCCB_Exported_Results>`;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `MCCB_Export_${this.userName || 'Anonymous'}_${timestamp}.xml`;
        
        // Create download link
        const dataBlob = new Blob([mergedXML], { type: 'application/xml' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showUploadStatus(`Data exported as ${fileName}`, 'success');
    }

    mergeXMLFiles() {
        if (this.testData.length === 0) {
            this.showUploadStatus('No data to merge', 'warning');
            return;
        }
        
        let mergedXML = `<?xml version="1.0" encoding="UTF-8"?>
<MCCB_Merged_Results>
    <Session_Info>
        <User_Name>${this.escapeXml(this.userName || 'Anonymous')}</User_Name>
        <Merge_Date>${new Date().toISOString()}</Merge_Date>
        <Total_Tests>${this.testData.length}</Total_Tests>
    </Session_Info>
    <Test_Results>`;
        
        this.testData.forEach(test => {
            const total = (test.scores && test.scores.total !== undefined && test.scores.total !== null)
                ? test.scores.total
                : 0;
            const max = (test.scores && test.scores.max !== undefined && test.scores.max !== null)
                ? test.scores.max
                : 0;
            const percentage = (test.scores && test.scores.percentage !== undefined && test.scores.percentage !== null)
                ? test.scores.percentage
                : 0;

            mergedXML += `
        <Test>
            <Test_Name>${this.escapeXml(test.testName)}</Test_Name>
            <Test_Date>${this.escapeXml(test.date)}</Test_Date>
            <Test_Time>${this.escapeXml(test.timestamp || '')}</Test_Time>
            <Scores>
                <Total>${this.escapeXml(total)}</Total>
                <Max>${this.escapeXml(max)}</Max>
                <Percentage>${this.escapeXml(percentage)}</Percentage>
                <Accuracy>${this.escapeXml(test.scores?.accuracy ?? '')}</Accuracy>
                <ReactionTime>${this.escapeXml(test.scores?.reactionTime ?? '')}</ReactionTime>
                <TotalLearning>${this.escapeXml(test.scores?.totalLearning ?? '')}</TotalLearning>
                <AverageLearning>${this.escapeXml(test.scores?.averageLearning ?? '')}</AverageLearning>
                <DelayedRecall>${this.escapeXml(test.scores?.delayedRecall ?? '')}</DelayedRecall>
                <Recognition>${this.escapeXml(test.scores?.recognition ?? '')}</Recognition>
            </Scores>
        </Test>`;
        });
        
        mergedXML += `
    </Test_Results>
</MCCB_Merged_Results>`;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `MCCB_Merged_${this.userName || 'Anonymous'}_${timestamp}.xml`;
        
        // Save to backend
        fetch('http://localhost:8001/save-merged-xml', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ xmlContent: mergedXML, fileName: fileName })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showUploadStatus(`Merged XML saved as ${fileName}`, 'success');
            } else {
                this.showUploadStatus('Failed to save merged XML', 'error');
            }
        })
        .catch(error => {
            console.log('Backend not available, downloading instead:', error);
            
            // Fallback: download the file
            const blob = new Blob([mergedXML], { type: 'text/xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            URL.revokeObjectURL(url);
            
            this.showUploadStatus(`Merged XML downloaded as ${fileName}`, 'success');
        });
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear all imported data from the current session?')) {
            this.testData = [];
            this.improvementData = [];
            this.completeData = [];
            
            // Destroy all charts
            Object.values(this.charts).forEach(chart => {
                if (chart) chart.destroy();
            });
            this.charts = {};
            
            // Reset file inputs
            document.getElementById('fileInput').value = '';
            document.getElementById('folderInput').value = '';
            
            // Hide data section
            document.getElementById('dataSection').classList.add('hidden');
            
            this.showUploadStatus('Current session data cleared', 'success');
        }
    }

    clearAllDataFolders() {
        if (confirm('Are you sure you want to clear all data folders? This will delete all XML files from data folders.')) {
            // Implementation would go here
            this.showUploadStatus('Data folders cleared (placeholder)', 'info');
        }
    }

    loadSampleFiles(filePaths) {
        console.log('Loading sample files:', filePaths);
        this.showLoading(true);
        this.showUploadStatus('Loading sample XML files...', 'info');
        
        // Sample XML content for each test type
        const sampleXMLs = {
            '../2.animal_naming/data/animal_naming_sample_dev.xml': `<?xml version="1.0" encoding="UTF-8"?>
<testResult>
  <testName>Animal Naming</testName>
  <score>22</score>
  <age>28</age>
  <percentile>50th-74th</percentile>
  <percentage>73.3%</percentage>
  <interpretation>Good performance - above average</interpretation>
  <date>2025-12-27T16:00:00.000Z</date>
  <timeTaken>60</timeTaken>
  <testDuration>60</testDuration>
  <timestamp>27.12.2025, 17:00:00</timestamp>
  <words>
    <word id="1">cat</word>
    <word id="2">dog</word>
    <word id="3">mouse</word>
    <word id="4">bird</word>
    <word id="5">cow</word>
    <word id="6">pig</word>
    <word id="7">chicken</word>
    <word id="8">sheep</word>
    <word id="9">goat</word>
    <word id="10">crocodile</word>
    <word id="11">whale</word>
    <word id="12">shark</word>
    <word id="13">deer</word>
    <word id="14">turtle</word>
    <word id="15">giraffe</word>
    <word id="16">tiger</word>
    <word id="17">lion</word>
    <word id="18">elephant</word>
    <word id="19">horse</word>
    <word id="20">rabbit</word>
    <word id="21">bear</word>
    <word id="22">wolf</word>
  </words>
</testResult>`,
            '../1.bacs_symbol_coding/data/bacs_symbol_coding_sample_dev.xml': `<?xml version="1.0" encoding="UTF-8"?>
<BACS_Test_Results>
    <Test_Info>
        <Test_Name>BACS Symbol Coding Test</Test_Name>
        <Test_Date>2025-12-27</Test_Date>
        <Test_Time>16:05:00</Test_Time>
    </Test_Info>
    <Results>
        <Score>58</Score>
        <Max_Score>150</Max_Score>
        <Percentage>38.67%</Percentage>
        <Time_Taken_Seconds>120</Time_Taken_Seconds>
        <Time_Per_Item>2.07</Time_Per_Item>
    </Results>
</BACS_Test_Results>`,
            '../7.HVLT_R/data/hvlt_r_sample_dev.xml': `<?xml version="1.0" encoding="UTF-8"?>
<HVLT_R_Test_Results>
    <Test_Info>
        <Test_Name>HVLT-R Test</Test_Name>
        <Test_Date>2025-12-27</Test_Date>
        <Test_Time>16:10:00</Test_Time>
    </Test_Info>
    <Results>
        <totalRecallScore>28</totalRecallScore>
        <learningScore>6</learningScore>
        <delayedRecallScore>9</delayedRecallScore>
        <retentionScore>85.7%</retentionScore>
        <percentage>78.0%</percentage>
        <immediateRecall>
            <trial>
                <trialNumber>1</trialNumber>
                <score>6</score>
            </trial>
            <trial>
                <trialNumber>2</trialNumber>
                <score>8</score>
            </trial>
            <trial>
                <trialNumber>3</trialNumber>
                <score>9</score>
            </trial>
        </immediateRecall>
    </Results>
</HVLT_R_Test_Results>`,
            '../8.BVMT-R/data/bvmt_r_sample_dev.xml': `<?xml version="1.0" encoding="UTF-8"?>
<BVMT_R_Test_Results>
    <Test_Info>
        <Test_Name>BVMT-R Test</Test_Name>
        <Test_Date>2025-12-27</Test_Date>
        <Test_Time>16:15:00</Test_Time>
    </Test_Info>
    <Results>
        <totalLearningScore>28</totalLearningScore>
        <averageLearningScore>7.0</averageLearningScore>
        <delayedRecallScore>9</delayedRecallScore>
        <recognitionScore>11</recognitionScore>
        <trials>
            <trial>
                <trialNumber>1</trialNumber>
                <score>5</score>
            </trial>
            <trial>
                <trialNumber>2</trialNumber>
                <score>7</score>
            </trial>
            <trial>
                <trialNumber>3</trialNumber>
                <score>8</score>
            </trial>
            <trial>
                <trialNumber>4</trialNumber>
                <score>8</score>
            </trial>
        </trials>
    </Results>
</BVMT_R_Test_Results>`,
            '../3.trail_making_a/data/trail_making_sample_dev.xml': `<?xml version="1.0" encoding="UTF-8"?>
<TMT_Test_Results>
    <Test_Info>
        <Test_Name>Trail Making Test Part A</Test_Name>
        <Test_Date>2025-12-27</Test_Date>
        <Test_Time>16:20:00</Test_Time>
    </Test_Info>
    <Results>
        <completionTime>28</completionTime>
        <errors>0</errors>
        <percentage>92.5%</percentage>
        <timeTaken>28</timeTaken>
        <testDuration>120</testDuration>
    </Results>
</TMT_Test_Results>`,
            '../4.cpt_ip/data/cpt_ip_sample_dev.xml': `<?xml version="1.0" encoding="UTF-8"?>
<CPT_Test_Results>
    <Test_Info>
        <Test_Name>CPT-IP Test</Test_Name>
        <Test_Date>2025-12-27</Test_Date>
        <Test_Time>16:25:00</Test_Time>
    </Test_Info>
    <Results>
        <accuracy>85.0%</accuracy>
        <reactionTime>420</reactionTime>
        <hits>45</hits>
        <misses>8</misses>
        <falseAlarms>5</falseAlarms>
        <correctRejections>42</correctRejections>
        <percentage>85.0%</percentage>
        <timeTaken>180</timeTaken>
        <testDuration>180</testDuration>
    </Results>
</CPT_Test_Results>`,
            '../5.WMS_III/data/wms_iii_sample_dev.xml': `<?xml version="1.0" encoding="UTF-8"?>
<WMS_III_Test_Results>
    <Test_Info>
        <Test_Name>WMS-III Spatial Span Test</Test_Name>
        <Test_Date>2025-12-27</Test_Date>
        <Test_Time>16:30:00</Test_Time>
    </Test_Info>
    <Results>
        <totalScore>18</totalScore>
        <maxScore>32</maxScore>
        <percentage>56.3%</percentage>
        <trials>
            <trial>
                <trialNumber>1</trialNumber>
                <score>4</score>
            </trial>
            <trial>
                <trialNumber>2</trialNumber>
                <score>5</score>
            </trial>
            <trial>
                <trialNumber>3</trialNumber>
                <score>4</score>
            </trial>
            <trial>
                <trialNumber>4</trialNumber>
                <score>5</score>
            </trial>
        </trials>
    </Results>
</WMS_III_Test_Results>`,
            '../6.Letter_Number_Span/data/letter_number_span_sample_dev.xml': `<?xml version="1.0" encoding="UTF-8"?>
<Letter_Number_Span_Test_Results>
    <Test_Info>
        <Test_Name>Letter-Number Span Test</Test_Name>
        <Test_Date>2025-12-27</Test_Date>
        <Test_Time>16:35:00</Test_Time>
    </Test_Info>
    <Results>
        <totalScore>14</totalScore>
        <maxScore>21</maxScore>
        <percentage>66.7%</percentage>
        <trials>
            <trial>
                <trialNumber>1</trialNumber>
                <score>3</score>
            </trial>
            <trial>
                <trialNumber>2</trialNumber>
                <score>4</score>
            </trial>
            <trial>
                <trialNumber>3</trialNumber>
                <score>3</score>
            </trial>
            <trial>
                <trialNumber>4</trialNumber>
                <score>4</score>
            </trial>
        </trials>
    </Results>
</Letter_Number_Span_Test_Results>`,
            '../9.NAB_Mazes/data/nab_mazes_sample_dev.xml': `<?xml version="1.0" encoding="UTF-8"?>
<NAB_Mazes_Test_Results>
    <Test_Info>
        <Test_Name>NAB Mazes Test</Test_Name>
        <Test_Date>2025-12-27</Test_Date>
        <Test_Time>16:40:00</Test_Time>
    </Test_Info>
    <Results>
        <totalScore>12</totalScore>
        <maxScore>20</maxScore>
        <percentage>60.0%</percentage>
        <completionTime>180</completionTime>
        <errors>3</errors>
        <trials>
            <trial>
                <trialNumber>1</trialNumber>
                <score>3</score>
            </trial>
            <trial>
                <trialNumber>2</trialNumber>
                <score>3</score>
            </trial>
            <trial>
                <trialNumber>3</trialNumber>
                <score>2</score>
            </trial>
            <trial>
                <trialNumber>4</trialNumber>
                <score>4</score>
            </trial>
        </trials>
    </Results>
</NAB_Mazes_Test_Results>`
        };
        
        // Process each sample XML
        const validResults = [];
        filePaths.forEach(filePath => {
            const xmlContent = sampleXMLs[filePath];
            if (xmlContent) {
                try {
                    const fileName = filePath.split('/').pop();
                    const testData = this.parseXMLData(xmlContent, fileName);
                    if (testData) {
                        if (Array.isArray(testData)) {
                            validResults.push(...testData);
                        } else {
                            validResults.push(testData);
                        }
                    }
                } catch (error) {
                    console.error('Error parsing sample XML:', filePath, error);
                }
            }
        });
        
        // Import the data
        if (validResults.length > 0) {
            this.processImportedData(validResults);
        } else {
            this.showLoading(false);
            this.showUploadStatus('No valid sample data found', 'error');
        }
    }
}

// ============ INITIALIZATION CODE ============

// Auto-load detected data on page load
async function loadDetectedData() {
    try {
        const response = await fetch('detected_data.json');
        const testData = await response.json();
        
        if (testData && testData.length > 0) {
            window.analytics.testData = testData;
            window.analytics.categorizeData();
            window.analytics.updateDashboard();
            window.analytics.showUploadStatus(`Auto-loaded ${testData.length} tests from data folders`, 'success');
        }
    } catch (error) {
        console.log('No detected data file found or error loading data');
    }
}

// Initialize analytics on page load
document.addEventListener('DOMContentLoaded', () => {
    window.analytics = new MCCBAnalytics();
});
