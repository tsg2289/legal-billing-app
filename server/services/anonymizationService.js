class AnonymizationService {
  constructor() {
    // Common patterns for identifiable information
    this.patterns = {
      // Names (first and last names)
      names: [
        /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // "John Smith"
        /\b[A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+\b/g, // "John A. Smith"
        /\b[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+\b/g, // "John Michael Smith"
      ],
      
      // Email addresses
      emails: [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
      ],
      
      // Phone numbers (various formats)
      phones: [
        /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // 123-456-7890
        /\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/g, // (123) 456-7890
        /\b\d{3}\s\d{3}\s\d{4}\b/g, // 123 456 7890
      ],
      
      // Social Security Numbers
      ssn: [
        /\b\d{3}-?\d{2}-?\d{4}\b/g, // 123-45-6789 or 123456789
      ],
      
      // Credit Card Numbers
      creditCards: [
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // 1234-5678-9012-3456
        /\b\d{13,19}\b/g, // 13-19 digit numbers
      ],
      
      // Addresses
      addresses: [
        /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Circle|Cir|Court|Ct)\b/gi,
        /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Circle|Cir|Court|Ct),?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?\b/gi,
      ],
      
      // Case numbers and file references
      caseNumbers: [
        /\bCase\s*#?\s*\d+[-\w]*\b/gi,
        /\bFile\s*#?\s*\d+[-\w]*\b/gi,
        /\bDocket\s*#?\s*\d+[-\w]*\b/gi,
        /\b[A-Z]{2,4}-\d{4}-\d{4,6}\b/g, // Court case format
      ],
      
      // Dates (various formats)
      dates: [
        /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // MM/DD/YYYY
        /\b\d{1,2}-\d{1,2}-\d{4}\b/g, // MM-DD-YYYY
        /\b\d{4}-\d{1,2}-\d{1,2}\b/g, // YYYY-MM-DD
        /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
      ],
      
      // Company names (common patterns)
      companies: [
        /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Inc|LLC|Corp|Corporation|Company|Co|Ltd|Limited)\b/gi,
        /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Associates|Partners|Group|Services|Systems|Solutions)\b/gi,
      ]
    };
    
    // Replacement patterns
    this.replacements = {
      names: '[CLIENT NAME]',
      emails: '[EMAIL ADDRESS]',
      phones: '[PHONE NUMBER]',
      ssn: '[SSN]',
      creditCards: '[CREDIT CARD]',
      addresses: '[ADDRESS]',
      caseNumbers: '[CASE NUMBER]',
      dates: '[DATE]',
      companies: '[COMPANY NAME]'
    };
  }

  /**
   * Anonymize text by replacing identifiable information
   * @param {string} text - Text to anonymize
   * @param {Object} options - Anonymization options
   * @returns {Object} - Anonymized text and list of replacements
   */
  anonymizeText(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return { text: '', replacements: [] };
    }

    let anonymizedText = text;
    const replacements = [];
    
    // Default options
    const config = {
      anonymizeNames: options.anonymizeNames !== false,
      anonymizeEmails: options.anonymizeEmails !== false,
      anonymizePhones: options.anonymizePhones !== false,
      anonymizeSSN: options.anonymizeSSN !== false,
      anonymizeCreditCards: options.anonymizeCreditCards !== false,
      anonymizeAddresses: options.anonymizeAddresses !== false,
      anonymizeCaseNumbers: options.anonymizeCaseNumbers !== false,
      anonymizeDates: options.anonymizeDates !== false,
      anonymizeCompanies: options.anonymizeCompanies !== false,
      ...options
    };

    // Process each type of identifiable information
    Object.entries(this.patterns).forEach(([type, patterns]) => {
      if (config[`anonymize${type.charAt(0).toUpperCase() + type.slice(1)}`]) {
        patterns.forEach(pattern => {
          const matches = anonymizedText.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const replacement = this.replacements[type];
              anonymizedText = anonymizedText.replace(match, replacement);
              replacements.push({
                type,
                original: match,
                replacement,
                position: anonymizedText.indexOf(replacement)
              });
            });
          }
        });
      }
    });

    return {
      text: anonymizedText,
      replacements,
      anonymized: replacements.length > 0
    };
  }

  /**
   * Check if text contains identifiable information
   * @param {string} text - Text to check
   * @returns {Object} - Detection results
   */
  detectIdentifiableInfo(text) {
    if (!text || typeof text !== 'string') {
      return { hasIdentifiableInfo: false, detectedTypes: [] };
    }

    const detectedTypes = [];
    
    Object.entries(this.patterns).forEach(([type, patterns]) => {
      patterns.forEach(pattern => {
        if (pattern.test(text)) {
          if (!detectedTypes.includes(type)) {
            detectedTypes.push(type);
          }
        }
      });
    });

    return {
      hasIdentifiableInfo: detectedTypes.length > 0,
      detectedTypes,
      count: detectedTypes.length
    };
  }

  /**
   * Get anonymization suggestions for specific text
   * @param {string} text - Text to analyze
   * @returns {Array} - Array of suggestions
   */
  getAnonymizationSuggestions(text) {
    const detection = this.detectIdentifiableInfo(text);
    const suggestions = [];

    if (detection.hasIdentifiableInfo) {
      detection.detectedTypes.forEach(type => {
        suggestions.push({
          type,
          description: this.getTypeDescription(type),
          replacement: this.replacements[type],
          severity: this.getSeverityLevel(type)
        });
      });
    }

    return suggestions;
  }

  /**
   * Get description for a type of identifiable information
   * @param {string} type - Type of information
   * @returns {string} - Description
   */
  getTypeDescription(type) {
    const descriptions = {
      names: 'Personal names that should be anonymized',
      emails: 'Email addresses that should be anonymized',
      phones: 'Phone numbers that should be anonymized',
      ssn: 'Social Security Numbers that must be anonymized',
      creditCards: 'Credit card numbers that must be anonymized',
      addresses: 'Physical addresses that should be anonymized',
      caseNumbers: 'Case numbers that should be anonymized',
      dates: 'Specific dates that should be anonymized',
      companies: 'Company names that should be anonymized'
    };
    return descriptions[type] || 'Identifiable information detected';
  }

  /**
   * Get severity level for a type of information
   * @param {string} type - Type of information
   * @returns {string} - Severity level
   */
  getSeverityLevel(type) {
    const severity = {
      names: 'medium',
      emails: 'high',
      phones: 'medium',
      ssn: 'critical',
      creditCards: 'critical',
      addresses: 'high',
      caseNumbers: 'low',
      dates: 'low',
      companies: 'medium'
    };
    return severity[type] || 'medium';
  }

  /**
   * Add custom pattern for anonymization
   * @param {string} type - Type of information
   * @param {RegExp} pattern - Regular expression pattern
   * @param {string} replacement - Replacement text
   */
  addCustomPattern(type, pattern, replacement) {
    if (!this.patterns[type]) {
      this.patterns[type] = [];
    }
    this.patterns[type].push(pattern);
    this.replacements[type] = replacement;
  }

  /**
   * Remove custom pattern
   * @param {string} type - Type of information
   * @param {RegExp} pattern - Pattern to remove
   */
  removeCustomPattern(type, pattern) {
    if (this.patterns[type]) {
      this.patterns[type] = this.patterns[type].filter(p => p.toString() !== pattern.toString());
    }
  }
}

export default new AnonymizationService();
