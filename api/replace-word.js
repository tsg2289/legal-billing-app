export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const { text, flaggedWord, replacement } = req.body;
      
      if (!text || !flaggedWord || !replacement) {
        return res.status(400).json({
          success: false,
          error: 'Text, flaggedWord, and replacement are required'
        });
      }

      // Replace the flagged word with the replacement
      const updatedText = text.replace(
        new RegExp(flaggedWord, 'gi'),
        replacement
      );

      res.status(200).json({
        success: true,
        updatedText: updatedText
      });
    } catch (error) {
      console.error('Error replacing word:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to replace word'
      });
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
}

