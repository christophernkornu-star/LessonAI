exports.cleanAndSplitText_MOCK = function(text) {
    if (!text) return [];
  
    let processed = text;
  
    // MOCKING THE CRITICAL PARTS OF THE PIPELINE
    
    // 1. Initial cleanup (simulated)
    // processed = removeOrphanAsterisks(processed);
  
    // 2. Step 2.5: Ensure content follows on same line! (MY PREVIOUS FIX)
    processed = processed.replace(/(Activity\s+\d+:)\s*\n\s*/gi, '$1 ');
    processed = processed.replace(/(Step\s+\d+:)\s*\n\s*/gi, '$1 ');
    
    // 3. Header formatting loop (REMOVES ** then re-adds?? No, that was removed in logic 2.5 context)
    // The actual code does:
    const headerTypes = [
      { pattern: /Activity\s+\d+:/gi, name: 'Activity' },
      // ...
    ];
    // It basically strips existing ** before lines processing
    
    // ...
    
    // 4. Broken Numbering Fix (The one moved to END)
    processed = processed.replace(/(\n|^)(\s*(?:\*\*)?\(?\d+[.)](?:\*\*)?)\s*\n\s*/g, '$1$2 ');
  
    return processed.split('\n');
};