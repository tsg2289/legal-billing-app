const wordFlags = [
  'client name',
  'plaintiff',
  'defendant',
  'company name',
  'address',
  'phone number',
  'email',
  'social security',
  'ssn',
  'date of birth',
  'dob',
  'medical record',
  'financial information',
  'bank account',
  'credit card',
  'personal information',
  'confidential',
  'privileged',
  'attorney-client',
  'work product'
];

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
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'Text is required'
        });
      }

      const foundFlags = wordFlags.filter(flag => 
        text.toLowerCase().includes(flag.toLowerCase())
      );

      res.status(200).json({
        success: true,
        flags: foundFlags
      });
    } catch (error) {
      console.error('Error checking word flags:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check word flags'
      });
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
}

