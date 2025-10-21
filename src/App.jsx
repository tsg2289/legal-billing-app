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
  const [templateSuggestions, setTemplateSuggestions] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [wordFlags, setWordFlags] = useState([]);
  const [showWordFlags, setShowWordFlags] = useState(false);
  const [hoveredSuggestion, setHoveredSuggestion] = useState(null);

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

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

  // Get template suggestions when description changes
  useEffect(() => {
    if (description.trim().length > 10) {
      getTemplateSuggestions(description);
    } else {
      setTemplateSuggestions([]);
    }
  }, [description]);

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

  const getTemplateSuggestions = async (desc) => {
    try {
      const response = await fetch('/api/templates/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc })
      });
      const data = await response.json();
      if (data.success) {
        setTemplateSuggestions(data.suggestions.slice(0, 3)); // Show top 3 suggestions
      }
    } catch (error) {
      console.error('Error getting template suggestions:', error);
    }
  };

  const handleTemplateSelect = (template) => {
    setDescription(template.description);
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
    // Look for patterns like "0.5:", "1.2:", "0.8:", etc.
    const match = entryText.match(/^(\d+(?:\.\d+)?):/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Function to remove hours prefix from text for display/editing
  const removeHoursFromText = (entryText) => {
    // Remove the hours prefix (e.g., "0.5: " from "0.5: Some text")
    return entryText.replace(/^\d+(?:\.\d+)?:\s*/, '');
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const newEntry = data.result?.trim() || '⚠️ No response';
      const hours = extractHours(newEntry);

      setEntries((prev) => [...prev, { case: caseName, entry: newEntry, hours }]);
      setDescription('');
    } catch (err) {
      console.error('❌ Error:', err);
      const errorMessage = err.message.includes('API key') 
        ? '❌ AI service not configured. Please check your OpenAI API key.'
        : '❌ Error generating billing entry.';
      setEntries((prev) => [...prev, { case: caseName, entry: errorMessage, hours: 0 }]);
    }
    setLoading(false);
  };

  const handleReset = () => setEntries([]);

  // Calculate total hours
  const totalHours = entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);

  const startEditing = (index, text) => {
    setEditingIndex(index);
    // Use the current entry text, ensuring we have the most up-to-date content
    const currentEntry = entries[index];
    const textToEdit = currentEntry?.entry || '';
    // Remove hours prefix from text for editing
    const textWithoutHours = removeHoursFromText(textToEdit);
    setEditingText(textWithoutHours);
    // Reset hours editing when starting text editing
    setEditingHours(false);
    setEditingHoursValue('');
  };

  const saveEdit = () => {
    const updated = [...entries];
    // Add hours prefix back to the text when saving
    const currentHours = updated[editingIndex].hours || 0;
    const textWithHours = `${currentHours}: ${editingText}`;
    updated[editingIndex].entry = textWithHours;
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
    // Update the text with the new hours prefix
    const currentText = updated[editingIndex].entry || '';
    const textWithoutHours = removeHoursFromText(currentText);
    updated[editingIndex].entry = `${newHours}: ${textWithoutHours}`;
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Main Container with Glass Effect */}
        <div className="glass p-8 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1>Legal Billing Generator</h1>
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
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium" style={{ color: 'var(--glass-text-secondary)' }}>
                Brief Billing Description
              </label>
              <button
                type="button"
                className="glass-button text-sm px-3 py-1"
                onClick={() => setShowTemplates(!showTemplates)}
              >
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Templates
                </span>
              </button>
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

              {/* Template Suggestions */}
              {templateSuggestions.length > 0 && description.trim().length > 10 && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                    💡 Template suggestions:
                  </p>
                  {templateSuggestions.map((suggestion, idx) => (
                    <div key={idx} className="glass p-3 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm" style={{ color: 'var(--glass-text)' }}>
                          {suggestion.name}
                        </h4>
                        <span 
                          className="text-xs px-2 py-1 glass rounded-full cursor-pointer hover:bg-opacity-30 transition-all duration-200" 
                          style={{ color: 'var(--glass-text-secondary)' }}
                          onMouseEnter={() => setHoveredSuggestion(idx)}
                        >
                          {suggestion.matchingTemplates.length} matches
                        </span>
                      </div>
                      <div className="space-y-1">
                        {suggestion.matchingTemplates.slice(0, 2).map((template, tIdx) => (
                          <button
                            key={tIdx}
                            className="w-full text-left p-2 glass rounded-lg hover:bg-opacity-20 transition-all duration-200"
                            onClick={() => handleTemplateSelect(template)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono" style={{ color: 'var(--glass-accent)' }}>
                                {template.time}
                              </span>
                              <span className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                                {template.description}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      {/* Hover Template List */}
                      {hoveredSuggestion === idx && (
                        <div 
                          className="absolute top-0 left-full ml-4 z-50 glass p-4 space-y-2 max-h-80 overflow-y-auto w-80" 
                          style={{ backdropFilter: 'blur(20px)', backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                          onMouseEnter={() => setHoveredSuggestion(idx)}
                          onMouseLeave={() => setHoveredSuggestion(null)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-sm" style={{ color: 'var(--glass-text)' }}>
                              All {suggestion.name} Templates
                            </h5>
                            <button
                              className="text-xs px-2 py-1 glass rounded hover:bg-opacity-20"
                              onClick={() => setHoveredSuggestion(null)}
                            >
                              ✕
                            </button>
                          </div>
                          <div className="space-y-1">
                            {suggestion.matchingTemplates.map((template, tIdx) => (
                              <button
                                key={tIdx}
                                className="w-full text-left p-2 glass rounded-lg hover:bg-opacity-20 transition-all duration-200"
                                onClick={() => {
                                  handleTemplateSelect(template);
                                  setHoveredSuggestion(null);
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono" style={{ color: 'var(--glass-accent)' }}>
                                    {template.time}
                                  </span>
                                  <span className="text-sm" style={{ color: 'var(--glass-text-secondary)' }}>
                                    {template.description}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
          <button
              className={`flex-1 glass-button glass-button-primary ${loading ? 'loading' : ''}`}
            onClick={handleGenerate}
            disabled={loading}
          >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Entry
                </span>
              )}
          </button>

          <button
              className="flex-1 glass-button glass-button-danger"
            onClick={handleReset}
          >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Reset All
              </span>
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

          <div className="glass p-6 space-y-4 max-h-[500px] overflow-y-auto">
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
              entries.map((item, idx) => (
                <div key={idx} className="glass-hover p-4 space-y-3">
                  <div className="space-y-3">
                    {/* Case Title */}
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--glass-accent)' }}></div>
                      <strong className="truncate" style={{ color: 'var(--glass-text)' }}>{item.case}</strong>
                    </div>
                    
                    {/* Entry Content Row */}
                    <div className="flex gap-4">
                      {/* Hours Column */}
                      <div className="flex-shrink-0 w-20">
                        {editingHours && editingIndex === idx ? (
                          <div className="glass p-3 text-center rounded-lg h-full flex flex-col justify-center items-center space-y-1">
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
                            className="glass p-3 text-center rounded-lg h-full flex flex-col justify-center cursor-pointer hover:bg-opacity-20 transition-all duration-200"
                            onClick={() => startEditingHours(idx, item.hours)}
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
                      <div className="flex-1" style={{ flex: '1 1 0%' }}>
                        {editingIndex === idx && !editingHours ? (
                          <div className="glass rounded-lg p-3" style={{ width: '100%' }}>
                            <textarea
                              value={editingText || removeHoursFromText(entries[idx]?.entry || '')}
                              onChange={(e) => setEditingText(e.target.value)}
                              onBlur={saveEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  saveEdit();
                                }
                              }}
                              className="w-full bg-transparent border-none outline-none resize whitespace-pre-wrap"
                              rows={3}
                              autoFocus
                              style={{ 
                                color: 'var(--glass-text-secondary)',
                                padding: '0',
                                margin: '0',
                                width: '100%',
                                minHeight: 'auto',
                                boxSizing: 'border-box',
                                minWidth: '100%'
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            className="cursor-pointer p-3 glass rounded-lg hover:bg-opacity-20 transition-all duration-200"
                            onClick={() => startEditing(idx, item.entry)}
                            style={{ width: '100%' }}
                          >
                            <p style={{ color: 'var(--glass-text-secondary)' }} className="whitespace-pre-wrap">
                              {item.entry || 'No content'}
                            </p>
                            <p className="text-xs mt-2" style={{ color: 'var(--glass-text-secondary)' }}>
                              Click to edit
                            </p>
                          </div>
                        )}
                  </div>
                      
                      {/* Delete Button */}
                      <div className="flex-shrink-0">
                  <button
                            className="glass-button p-2 hover:bg-red-500/20 transition-colors duration-200 h-full flex items-center justify-center"
                    onClick={() => deleteEntry(idx)}
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
      </div>
    </div>
  );
}
