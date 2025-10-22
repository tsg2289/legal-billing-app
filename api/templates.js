const templates = [
  {
    id: 'discovery',
    name: 'Discovery',
    time: '0.5',
    description: 'Review and analyze discovery documents received from opposing party'
  },
  {
    id: 'litigation-general',
    name: 'Litigation General',
    time: '1.0',
    description: 'General litigation work including case strategy and client communication'
  },
  {
    id: 'motion-practice',
    name: 'Motion Practice',
    time: '2.0',
    description: 'Draft and file motion with supporting memorandum of law'
  },
  {
    id: 'protective-order',
    name: 'Protective Order',
    time: '1.5',
    description: 'Draft protective order to safeguard confidential information'
  },
  {
    id: 'protective-order-expanded',
    name: 'Protective Order (Expanded)',
    time: '3.0',
    description: 'Draft comprehensive protective order with detailed confidentiality provisions'
  },
  {
    id: 'subpoena-deposition',
    name: 'Subpoena Deposition',
    time: '1.0',
    description: 'Prepare and serve subpoena for deposition testimony'
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

  if (req.method === 'GET') {
    try {
      res.status(200).json({
        success: true,
        templates: templates
      });
    } catch (error) {
      console.error('Error loading templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load templates'
      });
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
}
