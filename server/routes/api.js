import express from 'express';
import aiService from '../services/ai.js';

const router = express.Router();

// POST /api/generateBilling
router.post('/generateBilling', async (req, res) => {
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
        message: 'Please check your OpenAI API key configuration in the .env file'
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
});

// GET /api/health
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'billing-api',
    timestamp: new Date().toISOString()
  });
});

// AI service status endpoint
router.get('/ai/status', (req, res) => {
  try {
    const serviceInfo = aiService.getServiceInfo();
    const configValidation = aiService.validateConfiguration();
    
    res.json({
      service: serviceInfo,
      configuration: configValidation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get AI service status',
      message: error.message
    });
  }
});

export default router; 