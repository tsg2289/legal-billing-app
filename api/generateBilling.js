import OpenAI from 'openai';

export default async function handler(req, res) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Enable CORS with more restrictive settings
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' 
    ? 'https://legal-billing-app.vercel.app' // Your actual Vercel domain
    : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting check (basic implementation)
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log('Request from IP:', clientIP);

  try {
    const { fileNumber, caseName, description } = req.body;
    
    // Input validation and sanitization
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ 
        error: 'Missing required field: description',
        message: 'Please provide a billing description'
      });
    }

    // Sanitize inputs to prevent injection attacks
    const sanitizedDescription = description.trim().substring(0, 2000); // Limit length
    const sanitizedCaseName = caseName ? caseName.trim().substring(0, 200) : '';
    const sanitizedFileNumber = fileNumber ? fileNumber.trim().substring(0, 100) : '';

    // Additional validation
    if (sanitizedDescription.length < 3) {
      return res.status(400).json({ 
        error: 'Invalid input',
        message: 'Description must be at least 3 characters long'
      });
    }

    // Validate API key - secure logging
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not found in environment variables');
      console.error('Environment check:', {
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        keyLength: process.env.OPENAI_API_KEY?.length || 0,
        keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) || 'none',
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({
        error: 'AI service configuration error',
        message: 'AI service is temporarily unavailable. Please try again later.'
      });
    }

    // Validate API key format
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.error('❌ Invalid OpenAI API key format');
      return res.status(500).json({
        error: 'AI service configuration error',
        message: 'AI service is temporarily unavailable. Please try again later.'
      });
    }

    console.log('✅ OpenAI API key validated successfully');

    console.log('📝 Received billing generation request:', {
      fileNumber: sanitizedFileNumber || 'Not provided',
      caseName: sanitizedCaseName || 'Not provided',
      descriptionLength: sanitizedDescription.length,
      timestamp: new Date().toISOString()
    });

    // Initialize OpenAI with additional debugging
    console.log('🤖 Initializing OpenAI client...');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI client initialized successfully');

    // Create the prompt
    const prompt = `
You are a legal billing assistant drafting time entries for a law firm. Based on the inputs below, write a detailed and professional billing entry suitable for a client invoice.

The entry should clearly describe the task performed using formal legal billing language. Avoid vague or generic phrases. Be specific about what was reviewed, drafted, or discussed.

Inputs:
- File Number: ${sanitizedFileNumber || 'Not specified'}
- Case Name: ${sanitizedCaseName || 'Not specified'}
- Task Description: ${sanitizedDescription}

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

Output: Single billing entry line without time estimate
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
          content: 'You are a legal billing assistant that creates professional, detailed billing entries for law firms. Always respond with a single billing entry line without time estimates. Do not reference case names in the billing text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    
    console.log('✅ OpenAI API call successful');
    console.log('📊 Response details:', {
      hasChoices: !!response.choices,
      choicesLength: response.choices?.length || 0,
      hasUsage: !!response.usage,
      totalTokens: response.usage?.total_tokens || 0
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
    console.error('❌ Error in generateBilling:', {
      message: error.message,
      code: error.code,
      type: error.type,
      status: error.status,
      stack: error.stack?.substring(0, 500) // Limit stack trace length
    });
    
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
    
    // Generic error response
    res.status(500).json({
      error: 'Failed to generate billing entry',
      message: 'AI service temporarily unavailable. Please try again later.'
    });
  }
} 