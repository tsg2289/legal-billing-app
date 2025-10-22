import OpenAI from 'openai';

export default async function handler(req, res) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('🧪 Testing OpenAI API...');
    
    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ No API key found');
      return res.status(500).json({ error: 'No API key' });
    }
    
    console.log('✅ API key found, length:', process.env.OPENAI_API_KEY.length);
    
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI client created');
    
    // Make a simple API call
    console.log('🤖 Making test API call...');
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Use cheaper model for testing
      messages: [
        {
          role: 'user',
          content: 'Say "Hello, this is a test"'
        }
      ],
      max_tokens: 10,
    });
    
    console.log('✅ API call successful');
    console.log('Response:', response.choices[0]?.message?.content);
    
    res.json({
      success: true,
      message: 'OpenAI API test successful',
      response: response.choices[0]?.message?.content,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ OpenAI test failed:', {
      message: error.message,
      code: error.code,
      type: error.type,
      status: error.status
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      type: error.type,
      status: error.status
    });
  }
}
