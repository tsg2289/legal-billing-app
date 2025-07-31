import { useState } from 'react';

export default function BillingApp() {
  const [fileNumber, setFileNumber] = useState('');
  const [caseName, setCaseName] = useState('');
  const [description, setDescription] = useState('');
  const [entries, setEntries] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    // Validate required fields
    if (!description.trim()) {
      alert('Please enter a billing description.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/generateBilling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileNumber: fileNumber.trim(),
          caseName: caseName.trim(),
          description: description.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const newEntry = data.result?.trim() || '⚠️ No response';

      setEntries((prev) => [...prev, { case: caseName || 'Unnamed Case', entry: newEntry }]);
      setDescription('');
    } catch (err) {
      console.error('❌ Error:', err);
      let errorMessage = '❌ Error generating billing entry.';
      
      if (err.message.includes('API key')) {
        errorMessage = '❌ AI service not configured. Please check your OpenAI API key.';
      } else if (err.message.includes('Failed to fetch')) {
        errorMessage = '❌ Cannot connect to server. Please check if the backend is running.';
      } else if (err.message.includes('HTTP 400')) {
        errorMessage = '❌ Invalid request. Please check your input.';
      } else if (err.message.includes('HTTP 500')) {
        errorMessage = '❌ Server error. Please try again later.';
      }
      
      setEntries((prev) => [...prev, { case: caseName || 'Unnamed Case', entry: errorMessage }]);
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
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold text-[#40E0D0]">Legal Billing Generator</h1>

        <input
          className="w-full p-2 rounded bg-gray-900 text-white"
          placeholder="File Number"
          value={fileNumber}
          onChange={(e) => setFileNumber(e.target.value)}
        />

        <input
          className="w-full p-2 rounded bg-gray-900 text-white"
          placeholder="Case Name"
          value={caseName}
          onChange={(e) => setCaseName(e.target.value)}
        />

        <textarea
          className="w-full p-2 h-32 rounded bg-gray-900 text-white"
          placeholder="Brief Billing Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex gap-4">
          <button
            className="flex-1 bg-[#40E0D0] hover:bg-[#2cbeb8] text-black font-semibold py-2 rounded"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'Generating…' : 'Add Entry'}
          </button>

          <button
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-2 rounded"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold text-[#40E0D0] mb-2">Generated Entries</h2>
          <div className="bg-gray-800 p-4 rounded space-y-4 max-h-[500px] overflow-y-auto">
            {entries.length === 0 ? (
              <p className="text-gray-400">No entries yet.</p>
            ) : (
              entries.map((item, idx) => (
                <div key={idx} className="border-b border-gray-700 pb-2 flex justify-between gap-4">
                  <div className="flex-1">
                    <strong className="text-white block mb-1">{item.case}</strong>
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
                        className="w-full bg-gray-700 text-white rounded p-2"
                        rows={2}
                        autoFocus
                      />
                    ) : (
                      <div
                        className="text-gray-300 cursor-pointer hover:text-white"
                        onClick={() => startEditing(idx, item.entry)}
                      >
                        {item.entry}
                      </div>
                    )}
                  </div>
                  <button
                    className="text-red-400 hover:text-red-200 text-lg px-2"
                    onClick={() => deleteEntry(idx)}
                    title="Delete entry"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
