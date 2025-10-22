import OpenAI from 'openai';

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

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not found in environment variables');
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('OPENAI')));
      return res.status(500).json({
        error: 'AI service configuration error',
        message: 'Please check your OpenAI API key configuration'
      });
    }

    console.log('✅ OpenAI API key found:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');

    console.log('📝 Received billing generation request:', {
      fileNumber: fileNumber || 'Not provided',
      caseName: caseName || 'Not provided',
      descriptionLength: description.length,
      timestamp: new Date().toISOString()
    });

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create the prompt
    const prompt = `
You are a legal billing assistant drafting time entries for a law firm. Based on the inputs below, write a detailed and professional billing entry suitable for a client invoice.

The format should start with a time estimate (e.g., "0.6:", "1.2:"), and the entry should clearly describe the task performed using formal legal billing language. Avoid vague or generic phrases. Be specific about what was reviewed, drafted, or discussed.

Inputs:
- File Number: ${fileNumber || 'Not specified'}
- Case Name: ${caseName || 'Not specified'}
- Task Description: ${description.trim()}

Requirements:
1. Start with a time estimate (e.g., "0.6:", "1.2:")
2. Use formal legal billing language
3. Be specific about tasks performed
4. Avoid vague or generic phrases
5. Include relevant legal terminology
6. Keep entry concise but detailed
7. Focus on the actual work described

Output: Single billing entry line starting with time estimate
`;

    console.log('🤖 Generating billing entry with AI...', {
      promptLength: prompt.length,
      timestamp: new Date().toISOString()
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
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
      max_tokens: 500,
      temperature: 0.7,
    });

    let billingEntry = response.choices[0]?.message?.content?.trim();
    
    if (!billingEntry) {
      throw new Error('No response generated from AI service');
    }

    console.log('✅ Billing entry generated successfully:', {
      entryLength: billingEntry.length,
      tokensUsed: response.usage?.total_tokens,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      result: billingEntry,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in generateBilling:', error);
    
    // Handle specific AI service errors
    if (error.code === 'insufficient_quota') {
      return res.status(429).json({
        error: 'AI service quota exceeded',
        message: 'Please check your OpenAI account billing.'
      });
    }
    
    if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({
        error: 'AI service rate limit exceeded',
        message: 'Please try again in a moment.'
      });
    }
    
    if (error.code === 'invalid_api_key') {
      return res.status(500).json({
        error: 'Invalid AI service API key',
        message: 'Please check your OpenAI API key configuration'
      });
    }
    
    if (error.message.includes('API key') || error.message.includes('not configured')) {
      return res.status(500).json({
        error: 'AI service configuration error',
        message: 'Please check your OpenAI API key configuration'
      });
    }
    
    res.status(500).json({
      error: 'Failed to generate billing entry',
      message: error.message
    });
  }
} 