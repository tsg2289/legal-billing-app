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
            content: 'You are a legal billing assistant that creates professional, detailed billing entries for law firms. Always respond with a single billing entry line without time estimates. Do not reference case names in the billing text.'
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

The entry should clearly describe the task performed using formal legal billing language. Avoid vague or generic phrases. Be specific about what was reviewed, drafted, or discussed.

Inputs:
- File Number: ${fileNumber || 'Not specified'}
- Case Name: ${caseName || 'Not specified'}
- Task Description: ${description}

Requirements:
1. Use formal legal billing language
2. Be specific about tasks performed
3. Avoid vague or generic phrases
4. Include relevant legal terminology
5. Keep entry concise but detailed
6. Focus on the actual work described
7. DO NOT reference or include the case name in the billing entry text
8. Write the entry as if it will be used for any case - keep it generic and professional
9. DO NOT include time estimates (no "0.6:", "1.2:", etc.)
10. Consider the template suggestions below for professional language and structure
11. CRITICAL: Follow the word flagging instructions below if any flagged words are detected

${templateSuggestions}

${wordFlagWarning}

Output: Single billing entry line without time estimate
`;
  }

  /**
   * Generate enhancement suggestions for existing billing entries
   * @param {Object} params - Enhancement parameters
   * @param {string} params.entryText - Current billing entry text
   * @param {string} params.caseName - Case name
   * @param {string} params.fileNumber - File number
   * @returns {Promise<Array>} Array of enhancement suggestions
   */
  async generateEnhancementSuggestions({ entryText, caseName, fileNumber }) {
    try {
      // Validate API key
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }

      // Get template suggestions for context
      let templateSuggestions = '';
      try {
        templateSuggestions = await templateService.getTemplateSuggestionsForPrompt(entryText);
        console.log('Template suggestions:', templateSuggestions);
      } catch (templateError) {
        console.error('Template service error:', templateError);
        templateSuggestions = '';
      }
      
      // For now, use a simple template context to avoid issues
      templateSuggestions = '\n\nConsider using professional legal billing language and appropriate time estimates based on the complexity of the task.';
      
      // Check for flagged words
      const flaggedWords = wordFlagService.checkText(entryText);
      let wordFlagWarning = '';
      
      if (flaggedWords.length > 0) {
        wordFlagWarning = '\n\n⚠️ IMPORTANT WORD FLAGGING NOTICE:\n';
        wordFlagWarning += 'The client has flagged certain words. Please avoid using these words and use the suggested alternatives instead:\n\n';
        
        flaggedWords.forEach(flag => {
          wordFlagWarning += `- AVOID: "${flag.word}" (appears ${flag.count} time${flag.count > 1 ? 's' : ''})\n`;
          wordFlagWarning += `  REASON: ${flag.reason}\n`;
          wordFlagWarning += `  SUGGESTED ALTERNATIVES: ${flag.alternatives.join(', ')}\n\n`;
        });
        
        wordFlagWarning += 'Please rewrite your enhancement suggestions to use the suggested alternatives instead of the flagged words.\n';
      }

      // Create enhancement-specific prompt
      const prompt = `Enhance this billing entry with 3 different professional improvements:

Entry: "${entryText}"
Case: ${caseName || 'Not specified'}

${templateSuggestions}

Return ONLY this JSON format (no other text):
{
  "suggestions": [
    {
      "title": "Analysis Enhancement",
      "description": "Focuses on legal analysis and research",
      "enhancedText": "Enhanced text here",
      "suggestedHours": 0.5,
      "confidence": 90,
      "type": "analysis"
    },
    {
      "title": "Preparation Enhancement", 
      "description": "Focuses on preparation and documentation",
      "enhancedText": "Enhanced text here",
      "suggestedHours": 0.6,
      "confidence": 85,
      "type": "preparation"
    },
    {
      "title": "Strategy Enhancement",
      "description": "Focuses on strategic planning and approach",
      "enhancedText": "Enhanced text here", 
      "suggestedHours": 0.7,
      "confidence": 80,
      "type": "strategy"
    }
  ]
}`;

      console.log('🤖 Generating enhancement suggestions with AI...', {
        model: this.model,
        promptLength: prompt.length,
        timestamp: new Date().toISOString()
      });

      // Call OpenAI API
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a legal billing assistant that creates professional, detailed billing entries for law firms. Always respond with valid JSON containing exactly 3 enhancement suggestions. Do not include time estimates or case names in the billing text.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const responseText = response.choices[0]?.message?.content?.trim();
      
      if (!responseText) {
        throw new Error('No response generated from AI');
      }

      // Parse the JSON response
      let suggestions;
      try {
        console.log('Raw AI response:', responseText);
        
        // Try to extract JSON from the response if it's wrapped in markdown
        let jsonText = responseText.trim();
        
        // Remove markdown code blocks
        if (jsonText.startsWith('```json') && jsonText.endsWith('```')) {
          jsonText = jsonText.slice(7, -3).trim();
        } else if (jsonText.startsWith('```') && jsonText.endsWith('```')) {
          jsonText = jsonText.slice(3, -3).trim();
        }
        
        // Additional fallback for any remaining markdown
        if (jsonText.includes('```json')) {
          const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1].trim();
          }
        } else if (jsonText.includes('```')) {
          const jsonMatch = jsonText.match(/```\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonText = jsonMatch[1].trim();
          }
        }
        
        const parsed = JSON.parse(jsonText);
        suggestions = parsed.suggestions || parsed;
        
        // Ensure we have exactly 3 suggestions
        if (!Array.isArray(suggestions) || suggestions.length !== 3) {
          console.error('Invalid response format:', {
            isArray: Array.isArray(suggestions),
            length: suggestions?.length,
            suggestions: suggestions
          });
          throw new Error('Invalid response format - expected 3 suggestions');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.error('Raw response:', responseText);
        
        // Fallback: Generate basic suggestions if AI response is invalid
        console.log('Using fallback suggestions due to parsing error');
        suggestions = [
          {
            title: "Enhanced Analysis",
            description: "Focuses on comprehensive legal analysis",
            enhancedText: `Conduct comprehensive legal analysis regarding ${entryText.toLowerCase().includes('interrogatory') ? 'interrogatory responses and discovery matters' : 'case matters and legal issues'} including thorough review of applicable law, analysis of relevant precedents, and preparation of detailed findings with supporting legal authority.`,
            suggestedHours: 0.5,
            confidence: 75,
            type: "analysis"
          },
          {
            title: "Strategic Preparation",
            description: "Focuses on strategic case preparation",
            enhancedText: `Develop strategic case preparation regarding ${entryText.toLowerCase().includes('interrogatory') ? 'discovery strategy and interrogatory responses' : 'case strategy and legal approach'} including comprehensive planning, detailed documentation, and preparation of effective legal arguments to support client position.`,
            suggestedHours: 0.6,
            confidence: 70,
            type: "preparation"
          },
          {
            title: "Professional Enhancement",
            description: "Focuses on professional legal billing language",
            enhancedText: `Conduct professional legal work regarding ${entryText.toLowerCase().includes('interrogatory') ? 'discovery matters and interrogatory preparation' : 'case matters and legal proceedings'} including comprehensive review, strategic analysis, and detailed documentation in anticipation of case progression.`,
            suggestedHours: 0.4,
            confidence: 65,
            type: "general"
          }
        ];
      }

      // Validate and clean suggestions
      const cleanedSuggestions = suggestions.map((suggestion, index) => {
        if (!suggestion.title || !suggestion.enhancedText) {
          throw new Error(`Invalid suggestion ${index + 1}: missing required fields`);
        }

        return {
          title: suggestion.title,
          description: suggestion.description || `Enhanced version ${index + 1}`,
          enhancedText: suggestion.enhancedText,
          suggestedHours: Math.max(parseFloat(suggestion.suggestedHours) || 0.5, 0.1),
          confidence: Math.min(Math.max(parseInt(suggestion.confidence) || 85, 0), 100),
          type: suggestion.type || 'enhancement'
        };
      });

      console.log('✅ Enhancement suggestions generated successfully:', {
        suggestionCount: cleanedSuggestions.length,
        tokensUsed: response.usage?.total_tokens || 0,
        timestamp: new Date().toISOString()
      });

      return cleanedSuggestions;

    } catch (error) {
      console.error('❌ AI Enhancement Error:', error);
      
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
      throw new Error(`Failed to generate enhancement suggestions: ${error.message}`);
    }
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