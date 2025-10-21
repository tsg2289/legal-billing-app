import aiService from '../server/services/ai.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileNumber, caseName, description } = req.body;
    
    // Validate request
    if (!description || !description.trim()) {
      return res.status(400).json({ 
        error: 'Missing required field: description',
        message: 'Please provide a billing description'
      });
    }

    console.log('📝 Received billing generation request:', {
      fileNumber: fileNumber || 'Not provided',
      caseName: caseName || 'Not provided',
      descriptionLength: description.length,
      timestamp: new Date().toISOString()
    });

    // Generate billing entry using AI
    const billingEntry = await aiService.generateBillingEntry({
      fileNumber: fileNumber || '',
      caseName: caseName || '',
      description: description.trim()
    });
    
    res.json({
      success: true,
      result: billingEntry,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in generateBilling:', error);
    
    // Handle specific AI service errors
    if (error.message.includes('API key') || error.message.includes('not configured')) {
      return res.status(500).json({
        error: 'AI service configuration error',
        message: 'Please check your OpenAI API key configuration'
      });
    }
    
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return res.status(429).json({
        error: 'AI service temporarily unavailable',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to generate billing entry',
      message: error.message
    });
  }
} 