import { useState, useEffect } from 'react';

export default function BillingApp() {
  const [fileNumber, setFileNumber] = useState('');
  const [caseName, setCaseName] = useState('');
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [templateSuggestions, setTemplateSuggestions] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [wordFlags, setWordFlags] = useState([]);
  const [showWordFlags, setShowWordFlags] = useState(false);

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

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


  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generateBilling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileNumber,
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

      setEntries((prev) => [...prev, { case: caseName, entry: newEntry }]);
      setDescription('');
    } catch (err) {
      console.error('❌ Error:', err);
      const errorMessage = err.message.includes('API key') 
        ? '❌ AI service not configured. Please check your OpenAI API key.'
        : '❌ Error generating billing entry.';
      setEntries((prev) => [...prev, { case: caseName, entry: errorMessage }]);
    }
    setLoading(false);
  };

  const handleReset = () => setEntries([]);

  const startEditing = (index, text) => {
    setEditingIndex(index);
    setEditingText(text);
  };

  const saveEdit = () => {
    const updated = [...entries];
    updated[editingIndex].entry = editingText;
    setEntries(updated);
    setEditingIndex(null);
    setEditingText('');
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: 'var(--glass-text-secondary)' }}>
                File Number
              </label>
        <input
                className="glass-input"
                placeholder="Enter file number"
          value={fileNumber}
          onChange={(e) => setFileNumber(e.target.value)}
        />
            </div>
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
                    <div key={idx} className="glass p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm" style={{ color: 'var(--glass-text)' }}>
                          {suggestion.name}
                        </h4>
                        <span className="text-xs px-2 py-1 glass rounded-full" style={{ color: 'var(--glass-text-secondary)' }}>
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
                <div key={idx} className="glass glass-hover p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--glass-accent)' }}></div>
                        <strong className="truncate" style={{ color: 'var(--glass-text)' }}>{item.case}</strong>
                      </div>
                      
                    {editingIndex === idx ? (
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            saveEdit();
                          }
                        }}
                          className="glass-input glass-textarea w-full"
                          rows={3}
                        autoFocus
                      />
                    ) : (
                      <div
                          className="cursor-pointer p-3 glass rounded-lg hover:bg-opacity-20 transition-all duration-200"
                        onClick={() => startEditing(idx, item.entry)}
                      >
                          <p style={{ color: 'var(--glass-text-secondary)' }} className="whitespace-pre-wrap">
                        {item.entry}
                          </p>
                          <p className="text-xs mt-2" style={{ color: 'var(--glass-text-secondary)' }}>
                            Click to edit
                          </p>
                      </div>
                    )}
                  </div>
                    
                  <button
                      className="glass-button p-2 hover:bg-red-500/20 transition-colors duration-200"
                    onClick={() => deleteEntry(idx)}
                    title="Delete entry"
                  >
                      <svg className="w-4 h-4" style={{ color: 'var(--glass-danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                  </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
