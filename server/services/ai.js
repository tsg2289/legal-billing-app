import OpenAI from 'openai';
import dotenv from 'dotenv';
import templateService from './templateService.js';
import wordFlagService from './wordFlagService.js';
import anonymizationService from './anonymizationService.js';

dotenv.config();

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
    this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 500;
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;
  }

  /**
   * Generate a legal billing entry using AI
   * @param {Object} params - Billing parameters
   * @param {string} params.fileNumber - Case file number
   * @param {string} params.caseName - Case name
   * @param {string} params.description - Task description
   * @returns {Promise<string>} Generated billing entry
   */
  async generateBillingEntry({ fileNumber, caseName, description }) {
    try {
      // Validate API key
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      // Create the prompt
      const prompt = await this.createBillingPrompt({ fileNumber, caseName, description });

      console.log('🤖 Generating billing entry with AI...', {
        model: this.model,
        promptLength: prompt.length,
        timestamp: new Date().toISOString()
      });

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a legal billing assistant that creates professional, detailed billing entries for law firms. Always respond with a single billing entry line starting with a time estimate (e.g., "0.6:", "1.2:").'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      let billingEntry = response.choices[0]?.message?.content?.trim();
      
      if (!billingEntry) {
        throw new Error('No response generated from AI service');
      }

      // Anonymize the billing entry to protect identifiable information
      const anonymizationResult = anonymizationService.anonymizeText(billingEntry);
      if (anonymizationResult.anonymized) {
        console.log('🔒 Anonymized billing entry:', {
          originalLength: billingEntry.length,
          anonymizedLength: anonymizationResult.text.length,
          replacements: anonymizationResult.replacements.length,
          timestamp: new Date().toISOString()
        });
        billingEntry = anonymizationResult.text;
      }

      console.log('✅ Billing entry generated successfully:', {
        entryLength: billingEntry.length,
        tokensUsed: response.usage?.total_tokens,
        anonymized: anonymizationResult.anonymized,
        timestamp: new Date().toISOString()
      });

      return billingEntry;

    } catch (error) {
      console.error('❌ AI Service Error:', error);
      
      // Handle specific OpenAI errors
      if (error.code === 'insufficient_quota') {
        throw new Error('AI service quota exceeded. Please check your OpenAI account.');
      }
      
      if (error.code === 'rate_limit_exceeded') {
        throw new Error('AI service rate limit exceeded. Please try again in a moment.');
      }
      
      if (error.code === 'invalid_api_key') {
        throw new Error('Invalid AI service API key. Please check your configuration.');
      }
      
      // Generic error handling
      throw new Error(`Failed to generate billing entry: ${error.message}`);
    }
  }

  /**
   * Create a well-structured prompt for legal billing
   */
  async createBillingPrompt({ fileNumber, caseName, description }) {
    // Get template suggestions based on user description
    const templateSuggestions = await templateService.getTemplateSuggestionsForPrompt(description);
    
    // Check for flagged words in the description
    const flaggedWords = wordFlagService.checkText(description);
    let wordFlagWarning = '';
    
    if (flaggedWords.length > 0) {
      wordFlagWarning = '\n\n⚠️ IMPORTANT WORD FLAGGING NOTICE:\n';
      wordFlagWarning += 'The client has flagged certain words. Please avoid using these words and use the suggested alternatives instead:\n\n';
      
      flaggedWords.forEach(flag => {
        wordFlagWarning += `- AVOID: "${flag.word}" (appears ${flag.count} time${flag.count > 1 ? 's' : ''})\n`;
        wordFlagWarning += `  REASON: ${flag.reason}\n`;
        wordFlagWarning += `  SUGGESTED ALTERNATIVES: ${flag.alternatives.join(', ')}\n\n`;
      });
      
      wordFlagWarning += 'Please rewrite your billing entry to use the suggested alternatives instead of the flagged words.\n';
    }
    
    return `
You are a legal billing assistant drafting time entries for a law firm. Based on the inputs below, write a detailed and professional billing entry suitable for a client invoice.

The format should start with a time estimate (e.g., "0.6:", "1.2:"), and the entry should clearly describe the task performed using formal legal billing language. Avoid vague or generic phrases. Be specific about what was reviewed, drafted, or discussed.

Inputs:
- File Number: ${fileNumber || 'Not specified'}
- Case Name: ${caseName || 'Not specified'}
- Task Description: ${description}

Requirements:
1. Start with a time estimate (e.g., "0.6:", "1.2:")
2. Use formal legal billing language
3. Be specific about tasks performed
4. Avoid vague or generic phrases
5. Include relevant legal terminology
6. Keep entry concise but detailed
7. Focus on the actual work described
8. Consider the template suggestions below for appropriate time estimates and professional language
9. CRITICAL: Follow the word flagging instructions below if any flagged words are detected

${templateSuggestions}

${wordFlagWarning}

Output: Single billing entry line starting with time estimate
`;
  }

  /**
   * Validate the AI service configuration
   */
  validateConfiguration() {
    const errors = [];
    
    if (!process.env.OPENAI_API_KEY) {
      errors.push('OPENAI_API_KEY is not configured');
    }
    
    if (!this.model) {
      errors.push('OPENAI_MODEL is not configured');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get service status and configuration
   */
  getServiceInfo() {
    return {
      service: 'OpenAI',
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      configured: !!process.env.OPENAI_API_KEY
    };
  }
}

export default new AIService(); 