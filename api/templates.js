import fs from 'fs';
import path from 'path';

// Read template files from server/templates directory
const templatesDir = path.join(process.cwd(), 'server', 'templates');
const templateFiles = fs.readdirSync(templatesDir).filter(file => file.endsWith('.json'));

const templates = templateFiles.map(file => {
  const templatePath = path.join(templatesDir, file);
  const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  
  // Return the main template info
  return {
    id: templateData.id,
    name: templateData.name,
    description: templateData.description,
    category: templateData.category,
    templateCount: templateData.templates ? templateData.templates.length : 0
  };
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
