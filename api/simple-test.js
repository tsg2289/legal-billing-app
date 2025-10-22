export default function handler(req, res) {
  console.log('Simple test function called');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.json({
    success: true,
    message: 'Simple test function working',
    timestamp: new Date().toISOString(),
    method: req.method
  });
}
