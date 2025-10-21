import type { VercelRequest, VercelResponse } from '@vercel/node';
import aiService from '../server/services/ai.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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

    console.log('📝 Received billing generation request:', {
      fileNumber: fileNumber || 'Not provided',
      caseName: caseName || 'Not provided',
      descriptionLength: description.length,
      timestamp: new Date().toISOString()
    });

    // Analyze the billing description for legal keywords and context
    const analysis = enhancedParseBillingDescription(description.trim());
    console.log('🔍 Billing description analysis:', analysis);

    // Generate billing entry using AI
    const billingEntry = await aiService.generateBillingEntry({
      fileNumber: fileNumber || '',
      caseName: caseName || '',
      description: description.trim()
    });
    
    res.json({
      success: true,
      result: billingEntry,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error in generateBilling:', error);
    
    // Handle specific AI service errors
    if (error.message.includes('API key') || error.message.includes('not configured')) {
      return res.status(500).json({
        error: 'AI service configuration error',
        message: 'Please check your OpenAI API key configuration'
      });
    }
    
    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return res.status(429).json({
        error: 'AI service temporarily unavailable',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to generate billing entry',
      message: error.message
    });
  }
}

/**
 * Keyword-to-Context Map for Legal Billing
 * Each keyword maps to an array of relevant legal contexts/themes.
 */
export const KEYWORD_CONTEXT_MAP: Record<string, string[]> = {
  discovery: ["liability", "damages", "document review", "interrogatories", "depositions", "requests for production", "requests for admission", "expert discovery"],
  documents: ["review", "production", "analysis", "organization", "indexing", "privilege review"],
  interrogatories: ["drafting", "responding", "objections", "supplemental responses"],
  depositions: ["preparation", "conducting", "transcript review", "expert depositions", "party depositions"],
  "requests for production": ["drafting", "responding", "objections", "compliance"],
  "requests for admission": ["drafting", "responding", "objections"],
  motion: ["summary judgment", "dismiss", "compel", "strike", "protective order", "continuance", "default judgment"],
  "summary judgment": ["brief drafting", "evidence review", "oral argument", "response"],
  dismissal: ["motion to dismiss", "voluntary dismissal", "involuntary dismissal"],
  compel: ["motion to compel", "discovery compliance", "sanctions"],
  hearing: ["oral argument", "evidentiary hearing", "status conference", "pretrial conference", "settlement conference"],
  "oral argument": ["preparation", "presentation", "rebuttal"],
  conference: ["status", "pretrial", "settlement", "discovery"],
  settlement: ["negotiation", "mediation", "arbitration", "settlement conference", "release drafting"],
  mediation: ["preparation", "participation", "follow-up"],
  negotiation: ["settlement discussions", "demand letters", "counteroffers"],
  trial: ["preparation", "jury selection", "opening statements", "closing arguments", "evidence presentation"],
  jury: ["selection", "instructions", "deliberations"],
  evidence: ["presentation", "objections", "exhibits", "witness preparation"],
  appeal: ["brief drafting", "oral argument", "record review", "appellate research"],
  appellate: ["brief", "oral argument", "research"],
  research: ["case law", "statutory", "regulatory", "factual", "expert opinions"],
  brief: ["drafting", "research", "citation checking", "editing"],
  client: ["consultation", "updates", "strategy discussion", "document review"],
  consultation: ["strategy", "case evaluation", "risk assessment"],
  drafting: ["pleadings", "motions", "briefs", "contracts", "agreements"],
  pleadings: ["complaint", "answer", "counterclaim", "amendment"],
  expert: ["retention", "deposition", "report review", "testimony preparation"],
  witness: ["preparation", "deposition", "testimony", "investigation"],
  filing: ["court documents", "service", "deadlines", "compliance"],
  deadlines: ["court deadlines", "discovery deadlines", "filing deadlines"]
};

/**
 * Parses a billing description to identify legal keywords and their contexts
 */
export function parseBillingDescription(description: string) {
  const lowerDescription = description.toLowerCase();
  const detectedKeywords: Record<string, { contexts: string[] }> = {};

  for (const [keyword, contexts] of Object.entries(KEYWORD_CONTEXT_MAP)) {
    if (lowerDescription.includes(keyword.toLowerCase())) {
      detectedKeywords[keyword] = { contexts };
    }
  }

  return {
    originalDescription: description,
    detectedKeywords,
    keywordCount: Object.keys(detectedKeywords).length,
  };
}

/**
 * Enhanced parser that also looks for context clues and modifiers
 */
export function enhancedParseBillingDescription(description: string) {
  const basicAnalysis = parseBillingDescription(description);
  const lowerDescription = description.toLowerCase();

  const intensityWords: Record<string, string> = {
    "extensive": "high_complexity",
    "comprehensive": "high_complexity",
    "brief": "low_complexity",
    "urgent": "high_priority",
    "emergency": "high_priority",
    "routine": "low_priority",
    "preliminary": "early_stage",
    "final": "late_stage"
  };

  const detectedModifiers: Record<string, string> = {};
  for (const [modifier, category] of Object.entries(intensityWords)) {
    if (lowerDescription.includes(modifier)) {
      detectedModifiers[modifier] = category;
    }
  }

  return {
    ...basicAnalysis,
    modifiers: detectedModifiers,
    complexity: detectedModifiers["high_complexity"] ? "high" :
                detectedModifiers["low_complexity"] ? "low" : "medium",
    priority: detectedModifiers["high_priority"] ? "high" :
              detectedModifiers["low_priority"] ? "low" : "medium"
  };
}
