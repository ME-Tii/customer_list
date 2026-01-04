// Fixed BVMT-R parsing function
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
        if (score) scores.learningTrials.push(parseInt(score));
    });

    return scores;
}

// Fixed CPT-IP parsing function
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
