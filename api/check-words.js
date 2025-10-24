const wordFlags = [
  {
    word: 'client name',
    alternatives: ['client', 'party', 'individual', 'person'],
    severity: 'high',
    reason: 'Contains potentially sensitive client identification information'
  },
  {
    word: 'plaintiff',
    alternatives: ['claimant', 'petitioner', 'complainant', 'party'],
    severity: 'medium',
    reason: 'Identifies a party to the litigation'
  },
  {
    word: 'defendant',
    alternatives: ['respondent', 'accused', 'party', 'opposing party'],
    severity: 'medium',
    reason: 'Identifies a party to the litigation'
  },
  {
    word: 'company name',
    alternatives: ['entity', 'organization', 'corporation', 'business'],
    severity: 'high',
    reason: 'Contains potentially sensitive business identification information'
  },
  {
    word: 'address',
    alternatives: ['location', 'place', 'site', 'premises'],
    severity: 'high',
    reason: 'Contains potentially sensitive location information'
  },
  {
    word: 'phone number',
    alternatives: ['contact information', 'telephone', 'phone', 'communication'],
    severity: 'high',
    reason: 'Contains potentially sensitive contact information'
  },
  {
    word: 'email',
    alternatives: ['electronic communication', 'message', 'correspondence', 'contact'],
    severity: 'high',
    reason: 'Contains potentially sensitive contact information'
  },
  {
    word: 'social security',
    alternatives: ['SSN', 'identification number', 'ID number', 'personal identifier'],
    severity: 'critical',
    reason: 'Contains highly sensitive personal identification information'
  },
  {
    word: 'ssn',
    alternatives: ['social security number', 'identification number', 'ID number', 'personal identifier'],
    severity: 'critical',
    reason: 'Contains highly sensitive personal identification information'
  },
  {
    word: 'date of birth',
    alternatives: ['DOB', 'birth date', 'age', 'personal information'],
    severity: 'high',
    reason: 'Contains potentially sensitive personal information'
  },
  {
    word: 'dob',
    alternatives: ['date of birth', 'birth date', 'age', 'personal information'],
    severity: 'high',
    reason: 'Contains potentially sensitive personal information'
  },
  {
    word: 'medical record',
    alternatives: ['health information', 'medical information', 'health data', 'medical data'],
    severity: 'critical',
    reason: 'Contains highly sensitive medical information protected by HIPAA'
  },
  {
    word: 'financial information',
    alternatives: ['financial data', 'monetary information', 'economic data', 'financial details'],
    severity: 'high',
    reason: 'Contains potentially sensitive financial information'
  },
  {
    word: 'bank account',
    alternatives: ['account', 'financial account', 'banking information', 'account number'],
    severity: 'critical',
    reason: 'Contains highly sensitive financial account information'
  },
  {
    word: 'credit card',
    alternatives: ['payment method', 'card information', 'payment card', 'financial instrument'],
    severity: 'critical',
    reason: 'Contains highly sensitive payment information'
  },
  {
    word: 'personal information',
    alternatives: ['personal data', 'individual information', 'personal details', 'private information'],
    severity: 'high',
    reason: 'Contains potentially sensitive personal information'
  },
  {
    word: 'confidential',
    alternatives: ['private', 'sensitive', 'restricted', 'proprietary'],
    severity: 'medium',
    reason: 'Indicates sensitive or restricted information'
  },
  {
    word: 'privileged',
    alternatives: ['protected', 'confidential', 'restricted', 'sensitive'],
    severity: 'medium',
    reason: 'Indicates legally protected information'
  },
  {
    word: 'attorney-client',
    alternatives: ['legal privilege', 'attorney privilege', 'legal protection', 'privileged communication'],
    severity: 'medium',
    reason: 'Indicates legally privileged attorney-client communication'
  },
  {
    word: 'work product',
    alternatives: ['attorney work product', 'legal work', 'case preparation', 'litigation materials'],
    severity: 'medium',
    reason: 'Indicates attorney work product that may be privileged'
  }
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

      const foundFlags = [];
      const textLower = text.toLowerCase();
      
      wordFlags.forEach(flag => {
        const wordLower = flag.word.toLowerCase();
        if (textLower.includes(wordLower)) {
          // Count occurrences of the flagged word
          const count = (textLower.match(new RegExp(wordLower, 'g')) || []).length;
          
          foundFlags.push({
            word: flag.word,
            count: count,
            severity: flag.severity,
            reason: flag.reason,
            alternatives: flag.alternatives
          });
        }
      });

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

