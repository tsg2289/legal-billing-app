import OpenAI from 'openai';
import { getSuggestedTemplates, getTemplateSuggestionsForPrompt, checkWordFlags, anonymizeText } from '../server/services/ai.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { entryText, caseName, fileNumber } = req.body;

    // Validate input
    if (!entryText || typeof entryText !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid input', 
        message: 'Entry text is required and must be a string' 
      });
    }

    console.log('📝 Received billing enhancement request:', {
      fileNumber: fileNumber || 'Not specified',
      caseName: caseName || 'Not specified',
      entryLength: entryText.length,
      timestamp: new Date().toISOString()
    });

    // Get template suggestions for context
    const templateSuggestions = await getSuggestedTemplates(entryText, caseName);
    console.log('🔍 Template suggestions for enhancement:', {
      suggestionsType: typeof templateSuggestions,
      isArray: Array.isArray(templateSuggestions),
      length: templateSuggestions?.length || 0,
      firstItem: templateSuggestions?.[0] ? {
        id: templateSuggestions[0].id,
        name: templateSuggestions[0].name,
        category: templateSuggestions[0].category,
        relevanceScore: templateSuggestions[0].relevanceScore
      } : null
    });

    // Check for flagged words
    const wordFlags = await checkWordFlags(entryText);
    const hasFlaggedWords = wordFlags && wordFlags.length > 0;
    
    // Anonymize text if needed
    const anonymizedText = hasFlaggedWords ? await anonymizeText(entryText) : entryText;
    const isAnonymized = anonymizedText !== entryText;

    // Get template context for AI
    const templateContext = getTemplateSuggestionsForPrompt(templateSuggestions, entryText);

    // Create enhancement-specific prompt
    const prompt = `
You are a legal billing assistant specializing in enhancing existing billing entries. Your task is to provide 3 different enhancement suggestions for the given billing entry.

CURRENT BILLING ENTRY:
"${anonymizedText}"

CASE CONTEXT:
- Case Name: ${caseName || 'Not specified'}
- File Number: ${fileNumber || 'Not specified'}

TEMPLATE CONTEXT:
${templateContext}

ENHANCEMENT REQUIREMENTS:
1. Analyze the current entry and understand its legal context
2. Provide 3 distinct enhancement suggestions that improve the entry
3. Each suggestion should be contextually appropriate to the original content
4. Enhancements should be more detailed, professional, and comprehensive
5. Maintain the same legal focus and subject matter as the original
6. Use formal legal billing language
7. Be specific about tasks performed
8. Include relevant legal terminology
9. DO NOT change the fundamental nature of the work described
10. DO NOT reference case names in the billing text
11. DO NOT include time estimates (no "0.6:", "1.2:", etc.)

OUTPUT FORMAT:
Return exactly 3 enhancement suggestions in this JSON format:
{
  "suggestions": [
    {
      "title": "Enhancement Title 1",
      "description": "Brief description of this enhancement approach",
      "enhancedText": "The enhanced billing entry text...",
      "suggestedHours": 0.5,
      "confidence": 95,
      "type": "enhancement_type"
    },
    {
      "title": "Enhancement Title 2", 
      "description": "Brief description of this enhancement approach",
      "enhancedText": "The enhanced billing entry text...",
      "suggestedHours": 0.7,
      "confidence": 88,
      "type": "enhancement_type"
    },
    {
      "title": "Enhancement Title 3",
      "description": "Brief description of this enhancement approach", 
      "enhancedText": "The enhanced billing entry text...",
      "suggestedHours": 0.6,
      "confidence": 92,
      "type": "enhancement_type"
    }
  ]
}

Focus on making each suggestion distinct and valuable while staying true to the original entry's context and purpose.
`;

    console.log('🤖 Generating enhancement suggestions with AI...', {
      model: 'gpt-4o-2024-08-06',
      promptLength: prompt.length,
      timestamp: new Date().toISOString()
    });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
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

    const responseText = completion.choices[0]?.message?.content?.trim();
    
    if (!responseText) {
      throw new Error('No response generated from AI');
    }

    // Parse the JSON response
    let suggestions;
    try {
      const parsed = JSON.parse(responseText);
      suggestions = parsed.suggestions || parsed;
      
      // Ensure we have exactly 3 suggestions
      if (!Array.isArray(suggestions) || suggestions.length !== 3) {
        throw new Error('Invalid response format - expected 3 suggestions');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response:', responseText);
      throw new Error('Failed to parse AI response');
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
      tokensUsed: completion.usage?.total_tokens || 0,
      anonymized: isAnonymized,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      suggestions: cleanedSuggestions,
      metadata: {
        originalLength: entryText.length,
        anonymized: isAnonymized,
        templateContext: templateSuggestions?.length || 0,
        tokensUsed: completion.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    console.error('❌ Billing enhancement error:', error);
    
    // Provide more specific error messages
    let userMessage;
    if (error.message?.includes('API key')) {
      userMessage = 'AI service configuration error';
    } else if (error.message?.includes('quota')) {
      userMessage = 'AI service quota exceeded';
    } else if (error.message?.includes('rate limit')) {
      userMessage = 'Too many requests, please try again later';
    } else if (error.message?.includes('parse')) {
      userMessage = 'AI response format error';
    } else {
      userMessage = 'AI enhancement service temporarily unavailable';
    }

    res.status(500).json({
      success: false,
      error: userMessage,
      message: error.message
    });
  }
}
