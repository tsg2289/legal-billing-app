import { useState, useEffect } from 'react';

export default function BillingApp() {
  const [caseName, setCaseName] = useState('');
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingHours, setEditingHours] = useState(false);
  const [editingHoursValue, setEditingHoursValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [wordFlags, setWordFlags] = useState([]);
  const [showWordFlags, setShowWordFlags] = useState(false);
  const [collapsedCases, setCollapsedCases] = useState(new Set());
  const [draggedCase, setDraggedCase] = useState(null);
  const [dragOverCase, setDragOverCase] = useState(null);
  const [draggedEntry, setDraggedEntry] = useState(null);
  const [dragOverEntry, setDragOverEntry] = useState(null);
  const [editingCaseName, setEditingCaseName] = useState(null);
  const [editingCaseNameValue, setEditingCaseNameValue] = useState('');
  const [theme, setTheme] = useState('light');
  const [aiEnhancing, setAiEnhancing] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAIModal, setShowAIModal] = useState(false);
  const [previewSuggestion, setPreviewSuggestion] = useState(null);
  const [userPreferences] = useState({
    preferredStyle: 'comprehensive',
    legalFocus: 'general', 
    hourPreference: 'moderate'
  });

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('billing-app-theme') || 'light';
    setTheme(savedTheme);
  }, []);

  // Apply theme to document and save to localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('billing-app-theme', theme);
  }, [theme]);

  // Ensure editingText is properly synchronized when switching from hours to text editing
  useEffect(() => {
    if (editingIndex !== null && !editingHours && editingText === '') {
      const currentEntry = entries[editingIndex];
      if (currentEntry?.entry) {
        const textWithoutHours = removeHoursFromText(currentEntry.entry);
        setEditingText(textWithoutHours);
      }
    }
  }, [editingIndex, editingHours, editingText, entries]);


  // Check for flagged words when description changes
  useEffect(() => {
    if (description.trim().length > 3) {
      checkWordFlags(description);
    } else {
      setWordFlags([]);
    }
  }, [description]);


  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      if (data.success) {
        // Load full template data for each template
        const fullTemplates = await Promise.all(
          data.templates.map(async (template) => {
            try {
              const templateResponse = await fetch(`/api/templates/${template.id}`);
              const templateData = await templateResponse.json();
              return templateData.success ? templateData.template : template;
            } catch (error) {
              console.error(`Error loading template ${template.id}:`, error);
              return template;
            }
          })
        );
        setTemplates(fullTemplates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };


  const handleTemplateSelect = (template) => {
    // Create a billing entry directly from the template
    const hours = parseFloat(template.time) || 0;
    const entryText = `${template.time}: ${template.description}`;
    
    const newEntry = {
      case: caseName || 'New Case',
      entry: entryText,
      hours: hours
    };
    
    setEntries(prev => [...prev, newEntry]);
    setDescription('');
    setShowTemplates(false);
  };

  const checkWordFlags = async (text) => {
    try {
      const response = await fetch('/api/check-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await response.json();
      if (data.success) {
        setWordFlags(data.flags);
        setShowWordFlags(data.flags.length > 0);
      }
    } catch (error) {
      console.error('Error checking word flags:', error);
    }
  };

  const replaceWord = async (flaggedWord, replacement) => {
    try {
      const response = await fetch('/api/replace-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: description, 
          flaggedWord, 
          replacement 
        })
      });
      const data = await response.json();
      if (data.success) {
        setDescription(data.newText);
      }
    } catch (error) {
      console.error('Error replacing word:', error);
    }
  };


  // Function to extract hours from billing entry text
  const extractHours = (entryText) => {
    // Since AI no longer generates time estimates, return 0
    // Users will need to manually set hours
    return 0;
  };

  // Function to remove hours prefix from text for display/editing
  const removeHoursFromText = (entryText) => {
    // Since AI no longer generates time estimates, return text as-is
    return entryText;
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generateBilling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          caseName,
          description 
        })
      });

      // Safe debugging - only log status and basic info
      console.log('API Response Status:', response.status);
      console.log('API Response OK:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('API Error Response:', {
          status: response.status,
          error: errorData.error,
          message: errorData.message
        });
        
        // Provide more specific error messages based on status codes
        let userMessage;
        if (response.status === 500) {
          if (errorData.message?.includes('API key')) {
            userMessage = '❌ AI service configuration error. Please contact support.';
          } else if (errorData.message?.includes('quota')) {
            userMessage = '❌ AI service quota exceeded. Please try again later.';
          } else if (errorData.message?.includes('rate limit')) {
            userMessage = '❌ Too many requests. Please wait a moment and try again.';
          } else {
            userMessage = '❌ AI service temporarily unavailable. Please try again.';
          }
        } else if (response.status === 400) {
          userMessage = '❌ Invalid request. Please check your input and try again.';
        } else if (response.status === 429) {
          userMessage = '❌ Too many requests. Please wait a moment and try again.';
        } else {
          userMessage = '❌ Service temporarily unavailable. Please try again.';
        }
        
        throw new Error(userMessage);
      }

      const data = await response.json();
      console.log('API Success - Response received');
      
      const newEntry = data.result?.trim() || '⚠️ No response generated';
      const hours = extractHours(newEntry);

      setEntries((prev) => [...prev, { case: caseName, entry: newEntry, hours }]);
      setDescription('');
    } catch (err) {
      console.error('Billing generation error:', err.message);
      
      // Use the error message we created above, or fallback to generic message
      const errorMessage = err.message || '❌ Error generating billing entry.';
      setEntries((prev) => [...prev, { case: caseName, entry: errorMessage, hours: 0 }]);
    }
    setLoading(false);
  };

  const handleReset = () => setEntries([]);

  const handleManualEntry = () => {
    const newEntry = {
      case: caseName || 'New Case',
      entry: '',
      hours: 0
    };
    setEntries([...entries, newEntry]);
    
    // Start editing the new entry immediately
    const newIndex = entries.length;
    setEditingIndex(newIndex);
    setEditingText('');
    setEditingHours(false);
  };

  // Calculate total hours
  const totalHours = entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);

  const startEditing = (index, text) => {
    setEditingIndex(index);
    // Use the current entry text, ensuring we have the most up-to-date content
    const currentEntry = entries[index];
    const textToEdit = currentEntry?.entry || '';
    // Use text as-is without removing hours prefix
    setEditingText(textToEdit);
    // Reset hours editing when starting text editing
    setEditingHours(false);
    setEditingHoursValue('');
  };

  const saveEdit = () => {
    const updated = [...entries];
    // Save text without adding hours prefix
    updated[editingIndex].entry = editingText;
    setEntries(updated);
    setEditingIndex(null);
    setEditingText('');
    setEditingHours(false);
    setEditingHoursValue('');
  };

  const startEditingHours = (index, hours) => {
    setEditingIndex(index);
    setEditingHours(true);
    setEditingHoursValue(hours.toString());
    // Don't interfere with text editing state
  };

  const saveHoursEdit = () => {
    const updated = [...entries];
    const newHours = parseFloat(editingHoursValue) || 0;
    updated[editingIndex].hours = newHours;
    // Don't modify the text when changing hours
    setEntries(updated);
    setEditingHours(false);
    setEditingHoursValue('');
  };

  const cancelHoursEdit = () => {
    setEditingHours(false);
    setEditingHoursValue('');
    // Don't reset editingIndex to preserve text editing state
    // Also ensure the text editing state is preserved
  };

  const deleteEntry = (index) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleAIEnhancement = async (entryIndex) => {
    setAiEnhancing(entryIndex);
    setShowAIModal(true);
    
    try {
      const currentEntry = entries[entryIndex];
      
      // Call the new API endpoint for AI enhancement suggestions
      const response = await fetch('/api/enhanceBilling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          entryText: currentEntry.entry,
          caseName: currentEntry.case,
          fileNumber: undefined // We don't have file numbers in the current system
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate enhancement suggestions');
      }

      const data = await response.json();
      if (data.success && data.suggestions) {
        setAiSuggestions(data.suggestions);
      } else {
        throw new Error('Invalid response from enhancement service');
      }
    } catch (error) {
      console.error('AI enhancement error:', error);
      // Show error to user
      setAiSuggestions([{
        title: 'Error',
        description: 'Failed to generate AI suggestions',
        enhancedText: currentEntry.entry,
        suggestedHours: currentEntry.hours,
        confidence: 0,
        type: 'error'
      }]);
    }
  };

  // Regenerate suggestions using API
  const regenerateSuggestions = async () => {
    if (aiEnhancing !== null) {
      await handleAIEnhancement(aiEnhancing);
    }
  };

  const applyAISuggestion = (suggestion) => {
    console.log('Applying AI suggestion:', suggestion);
    console.log('AI enhancing index:', aiEnhancing);
    
    // Always start editing the entry with the AI suggestion
    setEditingIndex(aiEnhancing);
    setEditingText(suggestion.enhancedText);
    setEditingHoursValue(suggestion.suggestedHours.toString());
    setEditingHours(false); // Make sure we're in text editing mode, not hours editing
    
    console.log('Set editing index to:', aiEnhancing);
    console.log('Set editing text to:', suggestion.enhancedText);
    
    // Close the modal and reset AI state
    setShowAIModal(false);
    setAiSuggestions([]);
    setAiEnhancing(null);
    
    // Show success feedback
    setTimeout(() => {
      console.log('AI suggestion applied to text box');
    }, 100);
  };

  const toggleCaseCollapse = (caseName) => {
    setCollapsedCases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(caseName)) {
        newSet.delete(caseName);
      } else {
        newSet.add(caseName);
      }
      return newSet;
    });
  };

  const handleDragStart = (e, caseName) => {
    setDraggedCase(caseName);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e, caseName) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCase(caseName);
  };

  const handleDragLeave = () => {
    setDragOverCase(null);
  };

  const handleDrop = (e, targetCaseName) => {
    e.preventDefault();
    if (draggedCase && draggedCase !== targetCaseName) {
      // Get all unique case names in order
      const caseNames = [...new Set(entries.map(entry => entry.case))];
      const draggedCaseIndex = caseNames.indexOf(draggedCase);
      const targetCaseIndex = caseNames.indexOf(targetCaseName);
      
      if (draggedCaseIndex !== -1 && targetCaseIndex !== -1) {
        // Remove dragged case from its position
        caseNames.splice(draggedCaseIndex, 1);
        
        // Insert dragged case at the exact target position
        caseNames.splice(targetCaseIndex, 0, draggedCase);
        
        // Reorder entries based on new case order
        const reorderedEntries = [];
        caseNames.forEach(caseName => {
          const caseEntries = entries.filter(entry => entry.case === caseName);
          reorderedEntries.push(...caseEntries);
        });
        
        setEntries(reorderedEntries);
      }
    }
    setDraggedCase(null);
    setDragOverCase(null);
  };

  const handleDragEnd = () => {
    setDraggedCase(null);
    setDragOverCase(null);
  };

  const handleEntryDragStart = (e, entryIndex) => {
    setDraggedEntry(entryIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleEntryDragOver = (e, entryIndex) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverEntry(entryIndex);
  };

  const handleEntryDragLeave = () => {
    setDragOverEntry(null);
  };

  const handleEntryDrop = (e, targetEntryIndex) => {
    e.preventDefault();
    if (draggedEntry !== null && draggedEntry !== targetEntryIndex) {
      const newEntries = [...entries];
      const draggedItem = newEntries[draggedEntry];
      
      // Remove dragged item
      newEntries.splice(draggedEntry, 1);
      
      // Insert at the exact target position
      newEntries.splice(targetEntryIndex, 0, draggedItem);
      
      setEntries(newEntries);
    }
    setDraggedEntry(null);
    setDragOverEntry(null);
  };

  const handleEntryDragEnd = () => {
    setDraggedEntry(null);
    setDragOverEntry(null);
  };

  const startEditingCaseName = (caseName) => {
    setEditingCaseName(caseName);
    setEditingCaseNameValue(caseName);
  };

  const saveCaseNameEdit = () => {
    if (editingCaseName && editingCaseNameValue.trim()) {
      const updatedEntries = entries.map(entry => 
        entry.case === editingCaseName 
          ? { ...entry, case: editingCaseNameValue.trim() }
          : entry
      );
      setEntries(updatedEntries);
    }
    setEditingCaseName(null);
    setEditingCaseNameValue('');
  };

  const cancelCaseNameEdit = () => {
    setEditingCaseName(null);
    setEditingCaseNameValue('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Main Container with Glass Effect */}
        <div className="glass p-8 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-between">
            <div></div>
          <h1>Legal Billing Generator</h1>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="glass-button p-2 hover:bg-opacity-20 transition-all duration-200"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-lg" style={{ color: 'var(--glass-text-secondary)' }}>
            AI-powered billing entry generation with Apple Glass aesthetics
          </p>
        </div>

        {/* Form Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--glass-text-secondary)' }}>
              Case Name
            </label>
        <input
              className="glass-input"
              placeholder="Enter case name"
          value={caseName}
          onChange={(e) => setCaseName(e.target.value)}
        />
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--glass-text-secondary)' }}>
                Brief Billing Description
              </label>
            </div>
            
            <div className="relative">
        <textarea
                className="glass-input glass-textarea"
                placeholder="Describe the work performed or time spent..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

              {/* Word Flagging Warnings */}
              {wordFlags.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--glass-warning)' }}>
                      ⚠️ Flagged Words Detected
                    </span>
                    <button
                      className="text-xs glass-button px-2 py-1"
                      onClick={() => setShowWordFlags(!showWordFlags)}
                    >
                      {showWordFlags ? 'Hide' : 'Show'} Details
                    </button>
                  </div>
                  
                  {showWordFlags && (
                    <div className="space-y-2">
                      {wordFlags.map((flag, idx) => (
                        <div key={idx} className="glass p-3 space-y-2" style={{ borderColor: 'var(--glass-warning)' }}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm" style={{ color: 'var(--glass-warning)' }}>
                              "{flag.word}" appears {flag.count} time{flag.count > 1 ? 's' : ''}
                            </span>
                            <span className="text-xs px-2 py-1 glass rounded-full" style={{ color: 'var(--glass-text-secondary)' }}>
                              {flag.severity}
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                            {flag.reason}
                          </p>
                          <div className="space-y-1">
                            <p className="text-xs font-medium" style={{ color: 'var(--glass-text-secondary)' }}>
                              Suggested alternatives:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {flag.alternatives.map((alt, altIdx) => (
                                <button
                                  key={altIdx}
                                  className="text-xs px-2 py-1 glass rounded hover:bg-opacity-20 transition-all duration-200"
                                  onClick={() => replaceWord(flag.word, alt)}
                                >
                                  {alt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

                      </div>
                      </div>
                      
          {/* Entry Generation Buttons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Button 1: Manual Entry (No AI) */}
                            <button
              onClick={handleManualEntry}
              className="glass-button p-3 rounded-lg hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center gap-2"
                            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm">Manual Entry</span>
                            </button>

            {/* Button 2: AI Generate */}
          <button
            onClick={handleGenerate}
            disabled={loading}
              className="glass-button glass-button-primary p-3 rounded-lg hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
              {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              )}
              <span className="text-sm">{loading ? 'Generating...' : 'AI Generate'}</span>
          </button>

            {/* Button 3: Templates */}
          <button
              onClick={() => setShowTemplates(true)}
              className="glass-button p-3 rounded-lg hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm">Templates</span>
            </button>

            {/* Button 4: Reset All */}
            <button
            onClick={handleReset}
              className="glass-button glass-button-danger p-3 rounded-lg hover:bg-red-500/20 transition-all duration-200 flex items-center justify-center gap-2"
          >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              <span className="text-sm">Reset All</span>
          </button>
          </div>
        </div>

        {/* Entries Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2>Generated Entries</h2>
            <span className="text-sm px-3 py-1 glass rounded-full" style={{ color: 'var(--glass-text-secondary)' }}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          <div className="glass p-6 space-y-6">
            {entries.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 glass rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8" style={{ color: 'var(--glass-text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p style={{ color: 'var(--glass-text-secondary)' }}>No entries yet. Create your first billing entry above.</p>
              </div>
            ) : (
              Object.entries(
                entries.reduce((groups, item, idx) => {
                  if (!groups[item.case]) {
                    groups[item.case] = [];
                  }
                  groups[item.case].push({ ...item, originalIndex: idx });
                  return groups;
                }, {})
              ).map(([caseName, caseEntries]) => (
                <div 
                  key={caseName} 
                  className={`glass p-6 space-y-4 mb-8 transition-all duration-200 ${
                    draggedCase === caseName ? 'opacity-50 scale-95' : ''
                  } ${
                    dragOverCase === caseName ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                  }`}
                  style={{ 
                    borderLeft: '4px solid var(--glass-accent)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    cursor: 'grab'
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, caseName)}
                  onDragOver={(e) => handleDragOver(e, caseName)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, caseName)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Case Header */}
                  <div className="flex items-center justify-between mb-6 pb-4" style={{ 
                    borderBottom: '1px solid var(--glass-border)' 
                  }}>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <svg 
                          className="w-4 h-4 cursor-grab" 
                          style={{ color: 'var(--glass-text-muted)' }} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--glass-accent)' }}></div>
                      </div>
                      {editingCaseName === caseName ? (
                        <input
                          type="text"
                          value={editingCaseNameValue}
                          onChange={(e) => setEditingCaseNameValue(e.target.value)}
                          onBlur={saveCaseNameEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveCaseNameEdit();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelCaseNameEdit();
                            }
                          }}
                          className="text-xl font-bold bg-transparent border-none outline-none"
                          style={{ color: 'var(--glass-text)' }}
                          autoFocus
                        />
                      ) : (
                        <h3 
                          className="text-xl font-bold cursor-pointer hover:opacity-80 transition-opacity duration-200" 
                          style={{ color: 'var(--glass-text)' }}
                          onClick={() => startEditingCaseName(caseName)}
                          title="Click to edit case name"
                        >
                          {caseName}
                        </h3>
                      )}
                      <button
                        onClick={() => startEditingCaseName(caseName)}
                        className="glass-button p-1 hover:bg-opacity-20 transition-all duration-200"
                        title="Edit case name"
                      >
                        <svg 
                          className="w-4 h-4" 
                          style={{ color: 'var(--glass-text-secondary)' }} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={() => toggleCaseCollapse(caseName)}
                      className="glass-button p-2 hover:bg-opacity-20 transition-all duration-200"
                      title={collapsedCases.has(caseName) ? 'Expand case' : 'Collapse case'}
                    >
                      <svg 
                        className="w-5 h-5 transition-transform duration-200" 
                        style={{ 
                          color: 'var(--glass-text-secondary)',
                          transform: collapsedCases.has(caseName) ? 'rotate(-90deg)' : 'rotate(0deg)'
                        }} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    </div>
                    
                  {/* Entries for this case */}
                  {!collapsedCases.has(caseName) && (
                    <div className="space-y-1">
                      {caseEntries.map((item, idx) => (
                    <div 
                      key={item.originalIndex} 
                      className={`glass-hover p-4 space-y-3 transition-all duration-200 ${
                        draggedEntry === item.originalIndex ? 'opacity-50 scale-95' : ''
                      } ${
                        dragOverEntry === item.originalIndex ? 'ring-2 ring-blue-400 ring-opacity-50' : ''
                      }`}
                      style={{ cursor: 'grab' }}
                      draggable
                      onDragStart={(e) => handleEntryDragStart(e, item.originalIndex)}
                      onDragOver={(e) => handleEntryDragOver(e, item.originalIndex)}
                      onDragLeave={handleEntryDragLeave}
                      onDrop={(e) => handleEntryDrop(e, item.originalIndex)}
                      onDragEnd={handleEntryDragEnd}
                    >
                      <div className="space-y-2">
                        {/* Entry Content Row - no case title here */}
                        <div className="flex gap-3 items-stretch">
                          {/* Drag Handle */}
                          <div className="flex-shrink-0 flex items-center">
                            <svg 
                              className="w-4 h-4 cursor-grab" 
                              style={{ color: 'var(--glass-text-muted)' }} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                            </svg>
                          </div>
                      {/* Hours Column */}
                      <div className="flex-shrink-0 w-20">
                            {editingHours && editingIndex === item.originalIndex ? (
                              <div className="glass p-3 text-center rounded-lg flex flex-col justify-center items-center space-y-1 h-full">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={editingHoursValue}
                              onChange={(e) => setEditingHoursValue(e.target.value)}
                              onBlur={saveHoursEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveHoursEdit();
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  cancelHoursEdit();
                                }
                              }}
                              className="glass-input text-center text-lg font-bold"
                              style={{ 
                                color: 'var(--glass-accent)',
                                    width: '100%',
                                    padding: '8px 4px',
                                    minWidth: '60px',
                                    maxWidth: '80px'
                              }}
                              autoFocus
                            />
                            <div className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                              hours
                            </div>
                          </div>
                        ) : (
                          <div 
                                className="glass p-3 text-center rounded-lg flex flex-col justify-center cursor-pointer hover:bg-opacity-20 transition-all duration-200 h-full"
                                onClick={() => startEditingHours(item.originalIndex, item.hours)}
                            title="Click to edit hours"
                          >
                            <div className="text-lg font-bold" style={{ color: 'var(--glass-accent)' }}>
                              {item.hours > 0 ? item.hours.toFixed(1) : '0.0'}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                              hours
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Entry Content */}
                          <div className={editingIndex === item.originalIndex && !editingHours ? "w-full" : "flex-1"} style={{ minWidth: '0' }}>
                            {editingIndex === item.originalIndex && !editingHours ? (
                              <div className="glass rounded-lg p-3 relative" style={{ width: '100%' }}>
                      <textarea
                                  value={editingText || entries[item.originalIndex]?.entry || ''}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            saveEdit();
                          }
                        }}
                                  className="w-full bg-transparent border-none outline-none resize-both whitespace-pre-wrap"
                          rows={5}
                        autoFocus
                          style={{ 
                            color: 'var(--glass-text-secondary)',
                            padding: '0',
                            margin: '0',
                            width: '100%',
                            minWidth: '100%',
                            maxWidth: '100%',
                            minHeight: '120px',
                            boxSizing: 'border-box'
                          }}
                        />
                        
                        {/* AI Enhancement Button - Bottom Right */}
                        <button
                          className="absolute bottom-2 right-2 p-1.5 glass rounded-full hover:bg-blue-500/20 transition-colors duration-200 opacity-70 hover:opacity-100"
                          onClick={() => handleAIEnhancement(item.originalIndex)}
                          title="AI Enhance Entry"
                        >
                          <svg className="w-3.5 h-3.5" style={{ color: 'var(--glass-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div
                              className="cursor-pointer p-3 glass rounded-lg hover:bg-opacity-20 transition-all duration-200 h-full relative"
                                onClick={() => startEditing(item.originalIndex, item.entry)}
                                style={{ width: '100%' }}
                      >
                              <p style={{ color: 'var(--glass-text-secondary)' }} className="whitespace-pre-wrap">
                            {item.entry || 'No content'}
                              </p>
                              <p className="text-xs mt-2" style={{ color: 'var(--glass-text-secondary)' }}>
                                Click to edit
                              </p>
                              
                              {/* AI Enhancement Button - Bottom Right for Display Mode */}
                              <button
                                className="absolute bottom-2 right-2 p-1.5 glass rounded-full hover:bg-blue-500/20 transition-colors duration-200 opacity-70 hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent triggering the edit mode
                                  handleAIEnhancement(item.originalIndex);
                                }}
                                title="AI Enhance Entry"
                              >
                                <svg className="w-3.5 h-3.5" style={{ color: 'var(--glass-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                              </button>
                      </div>
                    )}
                  </div>
                      
                      {/* Delete Button */}
                      <div className="flex-shrink-0">
                  <button
                            className="glass-button p-2 hover:bg-red-500/20 transition-colors duration-200 flex items-center justify-center h-full"
                    onClick={() => deleteEntry(item.originalIndex)}
                    title="Delete entry"
                  >
                            <svg className="w-4 h-4" style={{ color: 'var(--glass-danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                  </button>
                      </div>
                    </div>
                  </div>
                    </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Total Hours Summary */}
        {entries.length > 0 && (
          <div className="mt-6">
            <div className="glass p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--glass-text)' }}>
                    Total Hours Billed
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                    {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold" style={{ color: 'var(--glass-accent)' }}>
                    {totalHours.toFixed(1)}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                    hours
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Browser Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="glass glass-hover w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-opacity-20" style={{ borderColor: 'var(--glass-border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Billing Templates</h2>
                <button
                  className="glass-button p-2"
                  onClick={() => setShowTemplates(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {templates.map((template) => (
                  <div key={template.id} className="glass p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium" style={{ color: 'var(--glass-text)' }}>
                        {template.name}
                      </h3>
                      <span className="text-sm px-3 py-1 glass rounded-full" style={{ color: 'var(--glass-text-secondary)' }}>
                        {template.templateCount} templates
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                      {template.description}
                    </p>
                    <div className="space-y-2">
                      {template.templates && template.templates.slice(0, 3).map((templateItem, idx) => (
                        <button
                          key={idx}
                          className="w-full text-left p-3 glass rounded-lg hover:bg-opacity-20 transition-all duration-200"
                          onClick={() => handleTemplateSelect(templateItem)}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono px-2 py-1 glass rounded" style={{ color: 'var(--glass-accent)' }}>
                              {templateItem.time}
                            </span>
                            <span className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                              {templateItem.description}
                            </span>
                          </div>
                        </button>
                      ))}
                      {template.templates && template.templates.length > 3 && (
                        <p className="text-xs text-center" style={{ color: 'var(--glass-text-secondary)' }}>
                          +{template.templates.length - 3} more templates
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Enhancement Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="glass p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--glass-text)' }}>
                ✨ AI Entry Enhancement
              </h3>
              <button 
                onClick={() => setShowAIModal(false)}
                className="text-2xl hover:opacity-70 transition-opacity"
                style={{ color: 'var(--glass-text-secondary)' }}
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2" style={{ color: 'var(--glass-text)' }}>
                  Current Entry:
                </h4>
                <p className="text-sm p-3 glass rounded" style={{ color: 'var(--glass-text-secondary)' }}>
                  {entries[aiEnhancing]?.entry}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2" style={{ color: 'var(--glass-text)' }}>
                  Choose an AI Enhancement:
                </h4>
                <p className="text-xs mb-3" style={{ color: 'var(--glass-text-secondary)' }}>
                  Click any suggestion below to populate the text box with that enhancement
                </p>
                <div className="space-y-2">
                  {aiSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left p-4 glass rounded-lg hover:bg-opacity-20 transition-all duration-200 border-2 border-transparent hover:border-blue-400/30"
                      onClick={() => applyAISuggestion(suggestion)}
                      onMouseEnter={() => setPreviewSuggestion(suggestion)}
                      onMouseLeave={() => setPreviewSuggestion(null)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--glass-text)' }}>
                            {suggestion.title}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                            {suggestion.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 glass rounded-full">
                            {suggestion.confidence}% match
                          </span>
                          <p className="text-xs mt-1" style={{ color: 'var(--glass-accent)' }}>
                            +{suggestion.suggestedHours - entries[aiEnhancing]?.hours}h
                          </p>
                        </div>
                      </div>
                      <p className="text-xs font-mono mt-2 p-2 glass rounded" style={{ color: 'var(--glass-text-secondary)' }}>
                        "{suggestion.enhancedText}"
                      </p>
                      <div className="mt-2 text-xs" style={{ color: 'var(--glass-accent)' }}>
                        ✨ Click to apply this enhancement
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="text-center pt-2">
                <p className="text-xs" style={{ color: 'var(--glass-text-secondary)' }}>
                  The selected enhancement will populate the text box for you to review and edit
                </p>
              </div>
              
            </div>
          </div>
        </div>
      )}

      {/* Real-time Preview Panel */}
      {previewSuggestion && (
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 w-80 glass p-4 rounded-lg z-50 max-h-96 overflow-y-auto">
          <h4 className="font-medium mb-2 text-sm" style={{ color: 'var(--glass-text)' }}>
            Preview Enhancement
          </h4>
          <p className="text-xs mb-2" style={{ color: 'var(--glass-text-secondary)' }}>
            {previewSuggestion.title}
          </p>
          <p className="text-xs font-mono p-2 glass rounded" style={{ color: 'var(--glass-text-secondary)' }}>
            "{previewSuggestion.enhancedText}"
          </p>
          <div className="mt-2 flex justify-between text-xs">
            <span style={{ color: 'var(--glass-accent)' }}>
              +{previewSuggestion.suggestedHours - entries[aiEnhancing]?.hours}h
            </span>
            <span className="text-blue-400">
              {previewSuggestion.confidence}% match
            </span>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
