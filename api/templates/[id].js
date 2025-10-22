import fs from 'fs';
import path from 'path';

// Read template files from server/templates directory
const templatesDir = path.join(process.cwd(), 'server', 'templates');

const templates = {};
const templateFiles = fs.readdirSync(templatesDir).filter(file => file.endsWith('.json'));

templateFiles.forEach(file => {
  const templatePath = path.join(templatesDir, file);
  const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  templates[templateData.id] = templateData;
});

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
