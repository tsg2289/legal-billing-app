const templates = {
  'discovery': {
    id: 'discovery',
    name: 'Discovery',
    time: '0.5',
    description: 'Review and analyze discovery documents received from opposing party',
    content: 'Review and analyze discovery documents received from opposing party, including interrogatories, requests for production, and requests for admission. Identify key facts, inconsistencies, and areas requiring follow-up investigation.'
  },
  'litigation-general': {
    id: 'litigation-general',
    name: 'Litigation General',
    time: '1.0',
    description: 'General litigation work including case strategy and client communication',
    content: 'Conduct general litigation activities including case strategy development, client communication regarding case status, review of case file, and preparation for upcoming deadlines.'
  },
  'motion-practice': {
    id: 'motion-practice',
    name: 'Motion Practice',
    time: '2.0',
    description: 'Draft and file motion with supporting memorandum of law',
    content: 'Draft motion with supporting memorandum of law, including legal research, citation formatting, and preparation of exhibits. File motion with court and serve on opposing counsel.'
  },
  'protective-order': {
    id: 'protective-order',
    name: 'Protective Order',
    time: '1.5',
    description: 'Draft protective order to safeguard confidential information',
    content: 'Draft protective order to safeguard confidential information exchanged during discovery, including provisions for handling sensitive documents and maintaining confidentiality.'
  },
  'protective-order-expanded': {
    id: 'protective-order-expanded',
    name: 'Protective Order (Expanded)',
    time: '3.0',
    description: 'Draft comprehensive protective order with detailed confidentiality provisions',
    content: 'Draft comprehensive protective order with detailed confidentiality provisions, including specific procedures for handling confidential information, return of documents, and enforcement mechanisms.'
  },
  'subpoena-deposition': {
    id: 'subpoena-deposition',
    name: 'Subpoena Deposition',
    time: '1.0',
    description: 'Prepare and serve subpoena for deposition testimony',
    content: 'Prepare subpoena for deposition testimony, including proper service requirements, scheduling coordination, and preparation of deposition outline.'
  }
};

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
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Template ID is required'
        });
      }

      const template = templates[id];
      
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      res.status(200).json({
        success: true,
        template: template
      });
    } catch (error) {
      console.error('Error loading template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load template'
      });
    }
  } else {
    res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }
}
