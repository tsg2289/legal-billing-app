import express from 'express';
import aiService from '../services/ai.js';
import templateService from '../services/templateService.js';
import wordFlagService from '../services/wordFlagService.js';
import anonymizationService from '../services/anonymizationService.js';

const router = express.Router();

// POST /api/generateBilling
router.post('/generateBilling', async (req, res) => {
  try {
    const { fileNumber, caseName, description } = req.body;
    
    // Validate request
    if (!description) {
      return res.status(400).json({ 
        error: 'Missing required field: description' 
      });
    }

    console.log('📝 Received billing generation request:', {
      fileNumber,
      caseName,
      descriptionLength: description.length,
      timestamp: new Date().toISOString()
    });

    // Generate billing entry using AI
    const billingEntry = await aiService.generateBillingEntry({
      fileNumber,
      caseName,
      description
    });
    
    res.json({
      success: true,
      result: billingEntry,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in generateBilling:', error);
    
    // Handle specific AI service errors
    if (error.message.includes('API key')) {
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
});

// POST /api/enhanceBilling - Get AI enhancement suggestions for existing billing entry
router.post('/enhanceBilling', async (req, res) => {
  try {
    const { entryText, caseName, fileNumber } = req.body;
    
    // Validate request
    if (!entryText) {
      return res.status(400).json({ 
        error: 'Missing required field: entryText' 
      });
    }

    console.log('📝 Received billing enhancement request:', {
      fileNumber: fileNumber || 'Not specified',
      caseName: caseName || 'Not specified',
      entryLength: entryText.length,
      timestamp: new Date().toISOString()
    });

    // Generate enhancement suggestions using AI
    const suggestions = await aiService.generateEnhancementSuggestions({
      entryText,
      caseName,
      fileNumber
    });
    
    res.json({
      success: true,
      suggestions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in enhanceBilling:', error);
    
    // Handle specific AI service errors
    if (error.message.includes('API key')) {
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
      error: 'Failed to generate enhancement suggestions',
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

// GET /api/templates - Get all available templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await templateService.getAllTemplates();
    res.json({
      success: true,
      templates,
      count: templates.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get templates',
      message: error.message
    });
  }
});

// GET /api/templates/:id - Get specific template
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await templateService.getTemplate(id);
    
    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message: `Template with ID '${id}' does not exist`
      });
    }
    
    res.json({
      success: true,
      template,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get template',
      message: error.message
    });
  }
});

// GET /api/templates/search/:query - Search templates
router.get('/templates/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const results = await templateService.searchTemplates(query);
    
    res.json({
      success: true,
      results,
      count: results.length,
      query,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to search templates',
      message: error.message
    });
  }
});

// POST /api/templates/suggest - Get template suggestions based on description
router.post('/templates/suggest', async (req, res) => {
  try {
    const { description } = req.body;
    
    if (!description) {
      return res.status(400).json({
        error: 'Missing required field: description'
      });
    }
    
    const suggestions = await templateService.getSuggestedTemplates(description);
    
    res.json({
      success: true,
      suggestions,
      count: suggestions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get template suggestions',
      message: error.message
    });
  }
});

// POST /api/check-words - Check text for flagged words
router.post('/check-words', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        error: 'Missing required field: text'
      });
    }
    
    const flags = wordFlagService.checkText(text);
    
    res.json({
      success: true,
      flags,
      count: flags.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check words',
      message: error.message
    });
  }
});

// POST /api/replace-word - Replace flagged word with alternative
router.post('/replace-word', (req, res) => {
  try {
    const { text, flaggedWord, replacement } = req.body;
    
    if (!text || !flaggedWord || !replacement) {
      return res.status(400).json({
        error: 'Missing required fields: text, flaggedWord, replacement'
      });
    }
    
    const newText = wordFlagService.replaceWord(text, flaggedWord, replacement);
    
    res.json({
      success: true,
      originalText: text,
      newText,
      replacedWord: flaggedWord,
      replacement,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to replace word',
      message: error.message
    });
  }
});

// GET /api/flagged-words - Get all flagged words
router.get('/flagged-words', (req, res) => {
  try {
    const flaggedWords = Array.from(wordFlagService.getFlaggedWords().entries()).map(([word, config]) => ({
      word,
      alternatives: config.alternatives,
      reason: config.reason,
      severity: config.severity
    }));
    
    res.json({
      success: true,
      flaggedWords,
      count: flaggedWords.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get flagged words',
      message: error.message
    });
  }
});

// POST /api/anonymize - Anonymize text
router.post('/anonymize', (req, res) => {
  try {
    const { text, options } = req.body;
    
    if (!text) {
      return res.status(400).json({
        error: 'Missing required field: text'
      });
    }
    
    const result = anonymizationService.anonymizeText(text, options);
    
    res.json({
      success: true,
      originalText: text,
      anonymizedText: result.text,
      replacements: result.replacements,
      anonymized: result.anonymized,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to anonymize text',
      message: error.message
    });
  }
});

// POST /api/detect-identifiable-info - Detect identifiable information
router.post('/detect-identifiable-info', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        error: 'Missing required field: text'
      });
    }
    
    const result = anonymizationService.detectIdentifiableInfo(text);
    const suggestions = anonymizationService.getAnonymizationSuggestions(text);
    
    res.json({
      success: true,
      hasIdentifiableInfo: result.hasIdentifiableInfo,
      detectedTypes: result.detectedTypes,
      count: result.count,
      suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to detect identifiable information',
      message: error.message
    });
  }
});

export default router; 