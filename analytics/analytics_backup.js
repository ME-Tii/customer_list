// MCCB Analytics Dashboard JavaScript

// Global functions for button handlers - defined immediately
function selectFolder() {
    console.log('selectFolder called');
    const folderInput = document.getElementById('folderInput');
    console.log('Folder input found:', !!folderInput);
    folderInput.click();
}

function autoDetectFolders() {
    console.log('autoDetectFolders called');
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.showUploadStatus('Scanning local test data folders...', 'info');
    analytics.showLoading(true);
    
    fetch('http://localhost:8001/scan-test-folders', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let message = `Found ${data.totalFiles} XML files in test data folders:\n\n`;
            Object.keys(data.folders).forEach(folder => {
                message += `${folder}: ${data.folders[folder].length} files\n`;
            });
            message += `\nUse "Select Folder" to load these files.`;
            analytics.showUploadStatus(message, 'success');
        } else {
            analytics.showUploadStatus(`Error scanning folders: ${data.error}`, 'error');
        }
        analytics.showLoading(false);
    })
    .catch(error => {
        console.log('Backend not available, using fallback:', error);
        analytics.showUploadStatus('Backend server not running - please start the server or use "Select Folder" manually', 'warning');
        analytics.showLoading(false);
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
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.handleFileSelect({ target: fileInput });
}

function handleFolderInputChange() {
    const folderInput = document.getElementById('folderInput');
    if (folderInput.files.length === 0) return;
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.handleFolderSelect({ target: folderInput });
}

class MCCBAnalytics {
    constructor() {
        this.testData = [];
        this.improvementData = []; // Multiple instances of same test over time
        this.completeData = []; // Complete MCCB sessions
        this.charts = {};
        this.userName = '';
        this.loadUserName();
    }

    loadUserName() {
        const savedName = localStorage.getItem('mccb_user_name');
        if (savedName) {
            this.userName = savedName;
            document.getElementById('userName').value = savedName;
        }
    }
    
    categorizeData() {
        // Reset categorization
        this.improvementData = [];
        this.completeData = [];
        
        // All MCCB test types that should be in a complete session
        const allMCCBTests = [
            'BACS Symbol Coding',
            'Animal Naming', 
            'Trail Making A',
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
            const dateKey = test.date || 'unknown';
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
        
        // Sort improvement data by test type and date for tracking
        this.improvementData.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type.localeCompare(b.type);
            }
            return new Date(a.date) - new Date(b.date);
        });
        
        console.log('Data categorized:', {
            improvementTests: this.improvementData.length,
            completeSessions: this.completeData.length
        });
    }
    
    updateUserName(name) {
        this.userName = name || document.getElementById('userName').value;
        localStorage.setItem('mccb_user_name', this.userName);
    }
    
    exportData() {
        if (this.testData.length === 0) {
            alert('No data to export');
            return;
        }
        
        // Create export data with user information
        const exportData = {
            userName: this.userName || 'Anonymous',
            exportDate: new Date().toISOString(),
            totalTests: this.testData.length,
            unifyingScore: this.calculateUnifyingScore(),
            testData: this.testData
        };
        
        // Create downloadable file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `MCCB_Results_${this.userName || 'Anonymous'}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showUploadStatus(`Data exported successfully for ${this.userName || 'Anonymous'}`, 'success');
    }

    mergeXMLFiles() {
        if (this.testData.length === 0) {
            alert('No data to merge. Please upload XML files first.');
            return;
        }

        // Create merged XML content
        let mergedXML = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        mergedXML += `<MCCB_Merged_Results>\n`;
        
        // Add session metadata
        mergedXML += `  <Session_Info>\n`;
        mergedXML += `    <User_Name>${this.userName || 'Anonymous'}</User_Name>\n`;
        mergedXML += `    <Merge_Date>${new Date().toISOString()}</Merge_Date>\n`;
        mergedXML += `    <Total_Tests>${this.testData.length}</Total_Tests>\n`;
        mergedXML += `    <Unifying_Score>${this.calculateUnifyingScore()}</Unifying_Score>\n`;
        mergedXML += `  </Session_Info>\n`;
        
        // Add all test results
        this.testData.forEach((test, index) => {
            mergedXML += `  <Test_Result index="${index + 1}">\n`;
            mergedXML += `    <Test_Name>${test.testName}</Test_Name>\n`;
            mergedXML += `    <Test_Type>${test.type}</Test_Type>\n`;
            mergedXML += `    <Test_Date>${test.date}</Test_Date>\n`;
            mergedXML += `    <Test_Time>${test.timestamp || ''}</Test_Time>\n`;
            
            // Add scores based on test type
            if (test.scores) {
                mergedXML += `    <Scores>\n`;
                Object.keys(test.scores).forEach(key => {
                    const value = test.scores[key];
                    if (typeof value === 'object') {
                        mergedXML += `      <${key}>\n`;
                        if (Array.isArray(value)) {
                            value.forEach((item, idx) => {
                                if (typeof item === 'object') {
                                    Object.keys(item).forEach(subKey => {
                                        mergedXML += `        <${subKey}>${item[subKey]}</${subKey}>\n`;
                                    });
                                } else {
                                    mergedXML += `        <item_${idx + 1}>${item}</item_${idx + 1}>\n`;
                                }
                            });
                        } else {
                            Object.keys(value).forEach(subKey => {
                                mergedXML += `        <${subKey}>${value[subKey]}</${subKey}>\n`;
                            });
                        }
                        mergedXML += `      </${key}>\n`;
                    } else {
                        mergedXML += `      <${key}>${value}</${key}>\n`;
                    }
                });
                mergedXML += `    </Scores>\n`;
            }
            
            mergedXML += `  </Test_Result>\n`;
        });
        
        mergedXML += `</MCCB_Merged_Results>`;
        
        // Create download link with proper naming
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `MCCB_Merged_${this.userName || 'Anonymous'}_${timestamp}.xml`;
        
        // Save to merged folder via backend
        fetch('http://localhost:8001/save-merged-xml', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                xmlContent: mergedXML,
                fileName: fileName
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showUploadStatus(`Merged XML file saved to merged_tests folder: ${fileName}`, 'success');
                console.log('File saved to:', data.filePath);
            } else {
                this.showUploadStatus(`Error saving merged file: ${data.error}`, 'error');
            }
        })
        .catch(error => {
            console.log('Backend not available, falling back to download:', error);
            // Fallback to download if backend is not available
            const dataBlob = new Blob([mergedXML], { type: 'application/xml' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            this.showUploadStatus(`Backend unavailable - downloaded merged file: ${fileName}`, 'warning');
        });
    }

    handleFileSelect(event) {
        const files = event.target.files;
        if (files.length === 0) return;
        
        this.showLoading(true);
        const promises = [];
        
        // Handle regular file selection (only XML files)
        const xmlFiles = Array.from(files).filter(file => file.name.endsWith('.xml'));
        
        if (xmlFiles.length === 0) {
            this.showUploadStatus('No XML files found in selection', 'error');
            this.showLoading(false);
            return;
        }
        
        this.showUploadStatus(`Processing ${xmlFiles.length} XML file(s)...`, 'info');
        
        for (let file of xmlFiles) {
            promises.push(this.readFile(file));
        }
        
        Promise.all(promises)
            .then(results => {
                const validResults = results.filter(data => data !== null);
                if (validResults.length === 0) {
                    this.showUploadStatus('No valid XML data could be parsed', 'error');
                } else {
                    validResults.forEach(data => {
                        this.testData.push(data);
                    });
                    this.categorizeData();
                    this.updateDashboard();
                    this.showUploadStatus(`✅ Successfully imported ${validResults.length} file(s) out of ${xmlFiles.length} selected`, 'success');
                }
            })
            .catch(error => {
                console.error('Error reading files:', error);
                this.showUploadStatus('Error reading files', 'error');
            })
            .finally(() => {
                this.showLoading(false);
            });
    }

    handleFolderSelect(event) {
        console.log('handleFolderSelect called');
        const files = event.target.files;
        console.log('Files selected:', files.length);
        
        if (files.length === 0) {
            console.log('No files selected');
            return;
        }
        
        console.log('Files:', Array.from(files).map(f => f.name));
        
        this.showLoading(true);
        const promises = [];
        
        // Handle directory upload - filter for XML files
        const xmlFiles = Array.from(files).filter(file => file.name.endsWith('.xml'));
        console.log('XML files found:', xmlFiles.length);
        
        if (xmlFiles.length === 0) {
            console.log('No XML files found');
            this.showUploadStatus('No XML files found in selected folder', 'error');
            this.showLoading(false);
            return;
        }
        
        this.showUploadStatus(`Processing ${xmlFiles.length} XML file(s) from folder...`, 'info');
        console.log('Starting to process XML files...');
        
        for (let file of xmlFiles) {
            console.log('Processing file:', file.name);
            promises.push(this.readFile(file));
        }
        
        Promise.all(promises)
            .then(results => {
                console.log('All files processed, results:', results);
                const validResults = results.filter(data => data !== null);
                console.log('Valid results:', validResults.length);
                
                if (validResults.length === 0) {
                    console.log('No valid results found');
                    this.showUploadStatus('No valid XML data could be parsed from folder', 'error');
                } else {
                    console.log('Adding valid results to testData');
                    validResults.forEach(data => {
                        this.testData.push(data);
                    });
                    console.log('Current testData length:', this.testData.length);
                    this.categorizeData();
                    this.updateDashboard();
                    this.showUploadStatus(`✅ Successfully imported ${validResults.length} file(s) from folder (${xmlFiles.length} XML files found)`, 'success');
                }
            })
            .catch(error => {
                console.error('Error reading files:', error);
                this.showUploadStatus('Error reading files from folder', 'error');
            })
            .finally(() => {
                console.log('Processing complete');
                this.showLoading(false);
            });
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    console.log('Reading file:', file.name);
                    const xmlData = e.target.result;
                    console.log('XML data length:', xmlData.length);
                    console.log('First 200 chars:', xmlData.substring(0, 200));
                    
                    const parsedData = this.parseXML(xmlData);
                    console.log('Parsed data for', file.name, ':', parsedData);
                    resolve(parsedData);
                } catch (error) {
                    console.error('Error parsing file:', file.name, error);
                    resolve(null);
                }
            };
            reader.onerror = (error) => {
                console.error('FileReader error for', file.name, error);
                reject(error);
            };
            reader.readAsText(file);
        });
    }

    parseXML(xmlString) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        
        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('Invalid XML format');
        }

        // Handle both XML formats: camelCase and BACS format
        const testName = xmlDoc.querySelector('testName')?.textContent || 
                         xmlDoc.querySelector('Test_Name')?.textContent || 
                         xmlDoc.querySelector('BACS_Test_Results Test_Info Test_Name')?.textContent || 
                         'Unknown Test';
        
        const timestamp = xmlDoc.querySelector('timestamp')?.textContent || 
                          xmlDoc.querySelector('Test_Time')?.textContent || '';
        
        const date = xmlDoc.querySelector('date')?.textContent || 
                    xmlDoc.querySelector('Test_Date')?.textContent || '';

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
            testData.scores = this.parseHVLTRScores(xmlDoc);
        }
        // BVMT-R specific parsing
        else if (testName.includes('BVMT-R')) {
            testData.scores = this.parseBVMTRScores(xmlDoc);
        }
        // NAB Mazes specific parsing
        else if (testName.includes('NAB Mazes')) {
            testData.scores = this.parseNABMazesScores(xmlDoc);
        }
        // Letter-Number Span specific parsing
        else if (testName.includes('Letter-Number')) {
            testData.scores = this.parseLetterNumberScores(xmlDoc);
        }
        // WMS-III Spatial Span specific parsing
        else if (testName.includes('WMS-III')) {
            testData.scores = this.parseWMSIIIScores(xmlDoc);
        }
        // BACS Symbol Coding specific parsing
        else if (testName.includes('BACS Symbol Coding')) {
            testData.scores = this.parseBACSSymbolCodingScores(xmlDoc);
        }
        // Animal Naming specific parsing
        else if (testName.includes('Animal Naming')) {
            testData.scores = this.parseAnimalNamingScores(xmlDoc);
        }
        // Trail Making specific parsing
        else if (testName.includes('Trail Making')) {
            testData.scores = this.parseTrailMakingScores(xmlDoc);
        }
        // CPT-IP specific parsing
        else if (testName.includes('CPT')) {
            testData.scores = this.parseCPTScores(xmlDoc);
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
        
        if (totalRecallScore) scores.totalRecall = parseInt(totalRecallScore);
        if (learningScore) scores.learning = parseInt(learningScore);
        if (delayedRecallScore) scores.delayedRecall = parseInt(delayedRecallScore);
        if (retentionScore) scores.retention = parseInt(retentionScore);

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
        
        // Summary scores
        const totalLearningScore = xmlDoc.querySelector('totalLearningScore')?.textContent;
        const averageLearningScore = xmlDoc.querySelector('averageLearningScore')?.textContent;
        const delayedRecallScore = xmlDoc.querySelector('delayedRecallScore')?.textContent;
        const recognitionScore = xmlDoc.querySelector('recognitionScore')?.textContent;
        
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
        if (percentage) scores.percentage = parseInt(percentage);

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
        
        if (score) scores.score = parseInt(score);
        if (timeTaken) scores.timeTaken = parseInt(timeTaken);
        if (testDuration) scores.testDuration = parseInt(testDuration);
        
        // Count words if available
        const words = xmlDoc.querySelectorAll('word');
        if (words.length > 0) scores.wordCount = words.length;

        return scores;
    }

    parseTrailMakingScores(xmlDoc) {
        const scores = {};
        
        const score = xmlDoc.querySelector('score')?.textContent;
        const timeTaken = xmlDoc.querySelector('timeTaken')?.textContent;
        const errors = xmlDoc.querySelector('errors')?.textContent;
        
        if (score) scores.score = parseInt(score);
        if (timeTaken) scores.timeTaken = parseInt(timeTaken);
        if (errors) scores.errors = parseInt(errors);

        return scores;
    }

    parseCPTScores(xmlDoc) {
        const scores = {};
        
        const score = xmlDoc.querySelector('score')?.textContent;
        const timeTaken = xmlDoc.querySelector('timeTaken')?.textContent;
        const accuracy = xmlDoc.querySelector('accuracy')?.textContent;
        const reactionTime = xmlDoc.querySelector('reactionTime')?.textContent;
        
        if (score) scores.score = parseInt(score);
        if (timeTaken) scores.timeTaken = parseInt(timeTaken);
        if (accuracy) scores.accuracy = parseFloat(accuracy);
        if (reactionTime) scores.reactionTime = parseFloat(reactionTime);

        return scores;
    }

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
    
    saveDataWithUser() {
        const exportData = {
            userName: this.userName || 'Anonymous',
            exportDate: new Date().toISOString(),
            totalTests: this.testData.length,
            unifyingScore: this.calculateUnifyingScore(),
            testData: this.testData
        };
        
        fetch('http://localhost:8001/save-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(exportData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Data saved with user information:', data.message);
            }
        })
        .catch(error => {
            console.log('Backend not available for saving data:', error);
        });
    }

    updateSummaryCards() {
        const totalTests = this.testData.length;
        const testTypes = [...new Set(this.testData.map(test => test.type))].length;
        
        // Date range
        const dates = this.testData.map(test => new Date(test.date)).filter(date => !isNaN(date));
        const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
        const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;
        const dateRange = minDate && maxDate ? 
            `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}` : '-';

        // Average performance (calculate based on available scores)
        let totalPerformance = 0;
        let performanceCount = 0;
        
        this.testData.forEach(test => {
            if (test.scores.total !== undefined) {
                totalPerformance += (test.scores.total / (test.scores.max || 1)) * 100;
                performanceCount++;
            } else if (test.scores.percentage !== undefined) {
                totalPerformance += test.scores.percentage;
                performanceCount++;
            }
        });
        
        const avgPerformance = performanceCount > 0 ? 
            Math.round(totalPerformance / performanceCount) + '%' : '-';

        document.getElementById('totalTests').textContent = totalTests;
        document.getElementById('testTypes').textContent = testTypes;
        document.getElementById('dateRange').textContent = dateRange;
        document.getElementById('avgPerformance').textContent = avgPerformance;
    }

    updateCharts() {
        this.updateUnifyingScore();
        this.updatePerformanceTimeline();
        this.updateTestTypeComparison();
        this.updateErrorAnalysis();
        this.updateProgressTracking();
        this.updateDetailedMetrics();
    }

    calculateUnifyingScore() {
        if (this.testData.length === 0) return 0;
        
        // Group tests by type and get only the most recent from each type
        const latestTests = {};
        this.testData.forEach(test => {
            if (!latestTests[test.type] || new Date(test.date + ' ' + (test.timestamp || '00:00:00')) > new Date(latestTests[test.type].date + ' ' + (latestTests[test.type].timestamp || '00:00:00'))) {
                latestTests[test.type] = test;
            }
        });
        
        const latestTestArray = Object.values(latestTests);
        
        let totalScore = 0;
        let validTests = 0;
        let consistencyBonus = 0;
        let improvementBonus = 0;
        
        // Calculate base performance score using only latest tests
        latestTestArray.forEach(test => {
            if (test.scores && test.scores.percentage !== undefined) {
                totalScore += test.scores.percentage;
                validTests++;
            }
        });
        
        const baseScore = validTests > 0 ? totalScore / validTests : 0;
        
        // Calculate consistency bonus using only latest tests
        if (validTests > 1) {
            const scores = latestTestArray
                .filter(test => test.scores && test.scores.percentage !== undefined)
                .map(test => test.scores.percentage);
            
            const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
            const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
            const stdDev = Math.sqrt(variance);
            
            // Lower standard deviation = higher consistency bonus
            consistencyBonus = Math.max(0, 10 - stdDev);
        }
        
        // Calculate improvement bonus using chronological progression of all tests
        if (this.testData.length > 2) {
            const sortedTests = this.testData
                .filter(test => test.scores && test.scores.percentage !== undefined)
                .sort((a, b) => new Date(a.date) - new Date(b.date));
            
            const firstHalf = sortedTests.slice(0, Math.floor(sortedTests.length / 2));
            const secondHalf = sortedTests.slice(Math.floor(sortedTests.length / 2));
            
            const firstAvg = firstHalf.reduce((sum, test) => sum + test.scores.percentage, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, test) => sum + test.scores.percentage, 0) / secondHalf.length;
            
            improvementBonus = Math.max(0, Math.min(10, (secondAvg - firstAvg) * 0.5));
        }
        
        // Calculate error penalty using only latest tests
        const errorCount = latestTestArray.filter(test => 
            test.scores && (test.scores.percentage === 0 || test.scores.total === 0)
        ).length;
        const errorPenalty = Math.min(20, errorCount * 5);
        
        // Final unifying score
        let finalScore = baseScore + consistencyBonus + improvementBonus - errorPenalty;
        finalScore = Math.max(0, Math.min(100, finalScore));
        
        return Math.round(finalScore);
    }
    
    getScoreInterpretation(score) {
        if (score >= 90) return "Excellent performance - Outstanding cognitive function";
        if (score >= 80) return "Very good performance - Above average cognitive function";
        if (score >= 70) return "Good performance - Average to above average cognitive function";
        if (score >= 60) return "Fair performance - Average cognitive function";
        if (score >= 50) return "Below average performance - May need attention";
        if (score >= 40) return "Poor performance - Clinical attention recommended";
        return "Very poor performance - Immediate clinical attention required";
    }
    
    updateUnifyingScore() {
        const score = this.calculateUnifyingScore();
        const interpretation = this.getScoreInterpretation(score);
        
        document.getElementById('unifyingScore').textContent = score;
        document.getElementById('scoreInterpretation').textContent = interpretation;
    }

    updatePerformanceTimeline() {
        const ctx = document.getElementById('performanceTimeline').getContext('2d');
        
        if (this.charts.performanceTimeline) {
            this.charts.performanceTimeline.destroy();
        }

        // Sort tests by date and time
        const sortedTests = this.testData
            .filter(test => test.scores && test.scores.percentage !== undefined)
            .sort((a, b) => new Date(a.date + ' ' + (a.timestamp || '00:00:00')) - new Date(b.date + ' ' + (b.timestamp || '00:00:00')));

        const labels = sortedTests.map(test => {
            const date = new Date(test.date);
            return `${date.toLocaleDateString()} ${test.timestamp || ''}`;
        });
        
        const performanceData = sortedTests.map(test => test.scores.percentage);

        this.charts.performanceTimeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Performance Score',
                    data: performanceData,
                    borderColor: 'rgba(52, 152, 219, 1)',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Performance Score (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date & Time'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const test = sortedTests[context.dataIndex];
                                return [`Score: ${context.parsed.y}%`, `Test: ${test.type}`, `Date: ${test.date}`];
                            }
                        }
                    }
                }
            }
        });
    }

    updateTestTypeComparison() {
        const ctx = document.getElementById('testTypeComparison').getContext('2d');
        
        if (this.charts.testTypeComparison) {
            this.charts.testTypeComparison.destroy();
        }

        // Calculate detailed statistics by test type
        const typeStats = {};
        this.testData.forEach(test => {
            if (!typeStats[test.type]) {
                typeStats[test.type] = { scores: [], count: 0, errors: 0 };
            }
            
            if (test.scores && test.scores.percentage !== undefined) {
                typeStats[test.type].scores.push(test.scores.percentage);
                if (test.scores.percentage === 0) {
                    typeStats[test.type].errors++;
                }
            } else {
                typeStats[test.type].errors++;
            }
            typeStats[test.type].count++;
        });

        const labels = Object.keys(typeStats);
        const avgScores = labels.map(type => {
            const scores = typeStats[type].scores;
            return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        });
        
        const errorRates = labels.map(type => {
            return Math.round((typeStats[type].errors / typeStats[type].count) * 100);
        });

        this.charts.testTypeComparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Average Score (%)',
                        data: avgScores,
                        backgroundColor: 'rgba(52, 152, 219, 0.6)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Error Rate (%)',
                        data: errorRates,
                        backgroundColor: 'rgba(231, 76, 60, 0.6)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Average Score (%)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Error Rate (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    updateErrorAnalysis() {
        const ctx = document.getElementById('errorAnalysis').getContext('2d');
        
        if (this.charts.errorAnalysis) {
            this.charts.errorAnalysis.destroy();
        }

        // Analyze errors and failed attempts
        const errorData = {};
        const totalTests = this.testData.length;
        
        this.testData.forEach(test => {
            const date = new Date(test.date).toLocaleDateString();
            if (!errorData[date]) {
                errorData[date] = { total: 0, errors: 0, successful: 0 };
            }
            
            errorData[date].total++;
            
            if (test.scores && (test.scores.percentage === 0 || test.scores.total === 0)) {
                errorData[date].errors++;
            } else if (test.scores && test.scores.percentage !== undefined) {
                errorData[date].successful++;
            }
        });

        const sortedDates = Object.keys(errorData).sort((a, b) => new Date(a) - new Date(b));
        const labels = sortedDates;
        const errorCounts = sortedDates.map(date => errorData[date].errors);
        const successCounts = sortedDates.map(date => errorData[date].successful);
        const errorRates = sortedDates.map(date => 
            Math.round((errorData[date].errors / errorData[date].total) * 100)
        );

        this.charts.errorAnalysis = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Successful Tests',
                        data: successCounts,
                        backgroundColor: 'rgba(46, 204, 113, 0.6)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Failed/Zero Score Tests',
                        data: errorCounts,
                        backgroundColor: 'rgba(231, 76, 60, 0.6)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Error Rate (%)',
                        data: errorRates,
                        type: 'line',
                        borderColor: 'rgba(241, 196, 15, 1)',
                        backgroundColor: 'rgba(241, 196, 15, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Test Count'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Error Rate (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }
    
    updateProgressTracking() {
        const ctx = document.getElementById('progressTracking').getContext('2d');
        
        if (this.charts.progressTracking) {
            this.charts.progressTracking.destroy();
        }

        // Calculate progress and improvement over time
        const sortedTests = this.testData
            .filter(test => test.scores && test.scores.percentage !== undefined)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (sortedTests.length < 2) {
            // Show a message if not enough data
            this.charts.progressTracking = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Need more data'],
                    datasets: [{
                        label: 'Progress Trend',
                        data: [0],
                        borderColor: 'rgba(155, 89, 182, 1)',
                        backgroundColor: 'rgba(155, 89, 182, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Need at least 2 test sessions to track progress'
                        }
                    }
                }
            });
            return;
        }

        // Calculate moving average and trend
        const windowSize = Math.max(2, Math.floor(sortedTests.length / 3));
        const movingAverages = [];
        const labels = [];
        
        for (let i = windowSize - 1; i < sortedTests.length; i++) {
            const window = sortedTests.slice(i - windowSize + 1, i + 1);
            const avg = window.reduce((sum, test) => sum + test.scores.percentage, 0) / window.length;
            movingAverages.push(Math.round(avg));
            
            const test = sortedTests[i];
            labels.push(`${new Date(test.date).toLocaleDateString()}`);
        }

        // Calculate trend line
        const trendLine = movingAverages.map((value, index) => {
            const firstValue = movingAverages[0];
            const lastValue = movingAverages[movingAverages.length - 1];
            const trend = (lastValue - firstValue) / (movingAverages.length - 1);
            return Math.round(firstValue + (trend * index));
        });

        this.charts.progressTracking = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Performance Trend (Moving Average)',
                        data: movingAverages,
                        borderColor: 'rgba(52, 152, 219, 1)',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Linear Trend',
                        data: trendLine,
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Performance Score (%)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (context.datasetIndex === 0) {
                                    return `Moving Average: ${context.parsed.y}%`;
                                } else {
                                    return `Trend: ${context.parsed.y}%`;
                                }
                            }
                        }
                    }
                }
            }
        });
    }
    
    updateDetailedMetrics() {
        const metricsGrid = document.getElementById('testMetricsGrid');
        metricsGrid.innerHTML = '';
        
        // Group tests by type and calculate detailed metrics
        const typeMetrics = {};
        
        this.testData.forEach(test => {
            if (!typeMetrics[test.type]) {
                typeMetrics[test.type] = {
                    tests: [],
                    scores: [],
                    totalTests: 0,
                    errors: 0
                };
            }
            
            typeMetrics[test.type].tests.push(test);
            typeMetrics[test.type].totalTests++;
            
            if (test.scores && test.scores.percentage !== undefined) {
                typeMetrics[test.type].scores.push(test.scores.percentage);
                if (test.scores.percentage === 0) {
                    typeMetrics[test.type].errors++;
                }
            } else {
                typeMetrics[test.type].errors++;
            }
        });
        
        // Create metric cards for each test type
        Object.keys(typeMetrics).forEach(type => {
            const metrics = typeMetrics[type];
            const scores = metrics.scores;
            
            const avgScore = scores.length > 0 ? 
                Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
            
            const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
            const minScore = scores.length > 0 ? Math.min(...scores) : 0;
            const errorRate = Math.round((metrics.errors / metrics.totalTests) * 100);
            
            // Calculate trend
            let trend = 'stable';
            let trendText = 'Stable';
            
            if (scores.length > 2) {
                const sortedTests = metrics.tests
                    .filter(test => test.scores && test.scores.percentage !== undefined)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                
                const firstHalf = sortedTests.slice(0, Math.floor(sortedTests.length / 2));
                const secondHalf = sortedTests.slice(Math.floor(sortedTests.length / 2));
                
                const firstAvg = firstHalf.reduce((sum, test) => sum + test.scores.percentage, 0) / firstHalf.length;
                const secondAvg = secondHalf.reduce((sum, test) => sum + test.scores.percentage, 0) / secondHalf.length;
                
                if (secondAvg > firstAvg + 5) {
                    trend = 'up';
                    trendText = 'Improving';
                } else if (secondAvg < firstAvg - 5) {
                    trend = 'down';
                    trendText = 'Declining';
                }
            }
            
            const card = document.createElement('div');
            card.className = 'test-metric-card';
            card.innerHTML = `
                <div class="metric-title">${type}</div>
                <div class="metric-value">${avgScore}%</div>
                <div style="font-size: 14px; margin-top: 10px;">
                    <div>Tests: ${metrics.totalTests}</div>
                    <div>Range: ${minScore}% - ${maxScore}%</div>
                    <div>Error Rate: ${errorRate}%</div>
                    <div class="metric-trend trend-${trend}">Trend: ${trendText}</div>
                </div>
            `;
            
            metricsGrid.appendChild(card);
        });
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (show) {
            loadingIndicator.classList.remove('hidden');
        } else {
            loadingIndicator.classList.add('hidden');
        }
    }

    showUploadStatus(message, type) {
        const statusDiv = document.getElementById('uploadStatus');
        const color = type === 'error' ? 'red' : type === 'warning' ? 'orange' : 'green';
        statusDiv.innerHTML = `<div style="color: ${color}; margin-top: 10px; white-space: pre-line;">${message}</div>`;
        
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 8000); // Longer timeout for warning messages
    }
    
    updateTestList() {
        const testListDiv = document.getElementById('testList');
        if (!testListDiv) return;
        
        if (this.testData.length === 0) {
            testListDiv.innerHTML = '<p>No test data available</p>';
            return;
        }
        
        // Sort tests by date (newest first)
        const sortedTests = [...this.testData].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        let html = '';
        sortedTests.forEach(test => {
            const score = test.scores?.total || test.scores?.percentage || 'N/A';
            const percentage = test.scores?.percentage ? `${test.scores.percentage}%` : '';
            const maxScore = test.scores?.max ? `/${test.scores.max}` : '';
            
            html += `<div class="test-item">
                <div class="test-info">
                    <div class="test-name">${test.testName}</div>
                    <div class="test-date">${test.date} ${test.timestamp || ''}</div>
                    <div class="test-type">${test.type}</div>
                </div>
                <div class="test-score-info">
                    <div class="test-score">Score: ${score}${maxScore}</div>
                    ${percentage ? `<div class="test-percentage">${percentage}</div>` : ''}
                </div>
            </div>`;
        });
        
        testListDiv.innerHTML = html;
    }
}

// Global functions for button onclick handlers
function handleFileInputChange() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) {
        return;
    }
    
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.handleFileSelect({ target: fileInput });
}

function handleFolderInputChange() {
    console.log('handleFolderInputChange triggered');
    const folderInput = document.getElementById('folderInput');
    console.log('Folder input element:', folderInput);
    console.log('Files in input:', folderInput.files.length);
    
    if (folderInput.files.length === 0) {
        console.log('No files in folder input');
        return;
    }
    
    const analytics = window.analytics || new MCCBAnalytics();
    console.log('Calling handleFolderSelect');
    analytics.handleFolderSelect({ target: folderInput });
}

function testUpload() {
    console.log('testUpload called');
    
    // Sample XML content for testing
    const sampleXML1 = `<?xml version="1.0" encoding="UTF-8"?>
<BACS_Test_Results>
    <Test_Info>
        <Test_Name>BACS Symbol Coding Test</Test_Name>
        <Test_Date>2025-12-25</Test_Date>
        <Test_Time>15:30:00</Test_Time>
        <Test_Duration_Seconds>90</Test_Duration_Seconds>
    </Test_Info>
    <Results>
        <Score>45</Score>
        <Max_Score>150</Max_Score>
        <Percentage>30.00%</Percentage>
        <Time_Taken_Seconds>90</Time_Taken_Seconds>
        <Time_Per_Item>0.60</Time_Per_Item>
    </Results>
</BACS_Test_Results>`;

    const sampleXML2 = `<?xml version="1.0" encoding="UTF-8"?>
<testResult>
  <testName>Animal Naming</testName>
  <score>15</score>
  <date>2025-12-25T15:30:00.000Z</date>
  <timeTaken>60</timeTaken>
  <testDuration>60</testDuration>
  <timestamp>25.12.2025, 16:30:00</timestamp>
</testResult>`;

    const analytics = window.analytics || new MCCBAnalytics();
    
    console.log('Testing with sample XML data...');
    analytics.showLoading(true);
    analytics.showUploadStatus('Testing upload with sample files...', 'info');
    
    // Parse sample files
    try {
        const data1 = analytics.parseXML(sampleXML1);
        const data2 = analytics.parseXML(sampleXML2);
        
        console.log('Sample data 1:', data1);
        console.log('Sample data 2:', data2);
        
        if (data1 && data2) {
            analytics.testData.push(data1, data2);
            analytics.updateDashboard();
            analytics.showUploadStatus('✅ Test successful! Sample data loaded.', 'success');
        } else {
            analytics.showUploadStatus('❌ Test failed: Could not parse sample XML', 'error');
        }
    } catch (error) {
        console.error('Test upload error:', error);
        analytics.showUploadStatus('❌ Test failed: ' + error.message, 'error');
    } finally {
        analytics.showLoading(false);
    }
}

function selectFolder() {
    console.log('selectFolder called');
    const folderInput = document.getElementById('folderInput');
    console.log('Folder input found:', !!folderInput);
    console.log('Clicking folder input');
    folderInput.click();
}

function updateUserName() {
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.updateUserName();
}

function exportData() {
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.exportData();
}

function mergeXMLFiles() {
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.mergeXMLFiles();
}

function clearAllDataFolders() {
    // Strong confirmation dialog
    const confirmation = confirm(
        '⚠️ WARNING: This will permanently delete ALL test data from ALL data folders!\n\n' +
        'This action cannot be undone and will:\n' +
        '• Delete all XML files from data folders\n' +
        '• Clear the detected_data.json file\n' +
        '• Reset all analytics and charts\n\n' +
        'Are you absolutely sure you want to continue?'
    );
    
    if (!confirmation) {
        return;
    }
    
    // Second confirmation for safety
    const finalConfirmation = prompt(
        'Type "DELETE ALL DATA" to confirm permanent deletion of all data folders:'
    );
    
    if (finalConfirmation !== 'DELETE ALL DATA') {
        alert('Data deletion cancelled. Confirmation text did not match.');
        return;
    }
    
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.showLoading(true);
    analytics.showUploadStatus('Clearing all data folders...', 'info');
    
    // Try to call backend service to clear data folders
    fetch('http://localhost:8001/clear-data-folders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Clear current data from memory
            analytics.testData = [];
            
            // Destroy all charts
            Object.values(analytics.charts).forEach(chart => {
                if (chart) chart.destroy();
            });
            analytics.charts = {};
            
            // Reset file inputs
            document.getElementById('fileInput').value = '';
            document.getElementById('folderInput').value = '';
            
            // Hide data section
            document.getElementById('dataSection').classList.add('hidden');
            
            analytics.showUploadStatus(`✅ ${data.message}`, 'success');
        } else {
            // Backend service failed, provide alternative solution
            handleBackendUnavailable(analytics);
        }
    })
    .catch(error => {
        console.error('Backend not available:', error);
        // Backend not available, provide alternative solution
        handleBackendUnavailable(analytics);
    })
    .finally(() => {
        analytics.showLoading(false);
    });
}

function handleBackendUnavailable(analytics) {
    // Since backend is not available, provide manual instructions
    analytics.showUploadStatus(
        '✅ Session data cleared successfully!\n\n' +
        '⚠️ To permanently delete data from folders, follow these steps:\n' +
        '1. Navigate to your data directories\n' +
        '2. Delete all .xml files from test folders\n' +
        '3. Delete detected_data.json file\n' +
        '4. Refresh this page\n\n' +
        'Current session has been reset.',
        'success'
    );
    
    // Clear current session data
    analytics.testData = [];
    
    // Destroy all charts
    Object.values(analytics.charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    analytics.charts = {};
    
    // Reset file inputs
    document.getElementById('fileInput').value = '';
    document.getElementById('folderInput').value = '';
    
    // Hide data section
    document.getElementById('dataSection').classList.add('hidden');
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all imported data from the current session?')) {
        const analytics = window.analytics || new MCCBAnalytics();
        analytics.testData = [];
        
        // Destroy all charts
        Object.values(analytics.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        analytics.charts = {};
        
        // Reset file inputs
        document.getElementById('fileInput').value = '';
        document.getElementById('folderInput').value = '';
        
        // Hide data section
        document.getElementById('dataSection').classList.add('hidden');
        
        analytics.showUploadStatus('Current session data cleared', 'success');
    }
}

function autoDetectFolders() {
    // Show loading message
    const analytics = window.analytics || new MCCBAnalytics();
    analytics.showUploadStatus('Scanning local test data folders...', 'info');
    analytics.showLoading(true);
    
    // Use backend to scan actual test folders
    fetch('http://localhost:8001/scan-test-folders', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let message = `Found ${data.totalFiles} XML files in test data folders:\n\n`;
            Object.keys(data.folders).forEach(folder => {
                message += `${folder}: ${data.folders[folder].length} files\n`;
            });
            message += `\nUse "Select Folder" to load these files.`;
            analytics.showUploadStatus(message, 'success');
        } else {
            analytics.showUploadStatus(`Error scanning folders: ${data.error}`, 'error');
        }
        analytics.showLoading(false);
    })
    .catch(error => {
        console.log('Backend not available, using fallback:', error);
        analytics.showUploadStatus('Backend server not running - please start the server or use "Select Folder" manually', 'warning');
        analytics.showLoading(false);
    });
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all imported data from the current session?')) {
        const analytics = window.analytics || new MCCBAnalytics();
        analytics.testData = [];
        
        // Destroy all charts
        Object.values(analytics.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        analytics.charts = {};
        
        // Reset file inputs
        document.getElementById('fileInput').value = '';
        document.getElementById('folderInput').value = '';
        
        // Hide data section
        document.getElementById('dataSection').classList.add('hidden');
        
        // Clear upload status
        document.getElementById('uploadStatus').innerHTML = '';
        
        // Show success message
        analytics.showUploadStatus('All current data cleared successfully', 'success');
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
        Object.keys(dataByTestType).forEach(testType => {
            html += `<div class="test-type-section">
                <h4>${testType} (${dataByTestType[testType].length} tests)</h4>
                <div class="test-list">`;
            
            dataByTestType[testType].forEach(test => {
                const score = test.scores?.total || test.scores?.percentage || 'N/A';
                html += `<div class="test-item">
                    <span class="test-date">${test.date}</span>
                    <span class="test-score">Score: ${score}</span>
                    <span class="test-time">${test.timestamp || ''}</span>
                </div>`;
            });
            
            html += '</div></div>';
        });
        
        improvementSection.innerHTML = html;
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
                const score = test.scores?.total || test.scores?.percentage || 'N/A';
                html += `<div class="test-card">
                    <h5>${test.type}</h5>
                    <p>Score: ${score}</p>
                    <small>${test.timestamp || ''}</small>
                </div>`;
            });
            
            html += '</div></div></div>';
        });
        
        completeSection.innerHTML = html;
    }
}

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
    loadDetectedData(); // Auto-load detected data
});
