import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TemplateService {
  constructor() {
    this.templatesDir = path.join(__dirname, '../templates');
    this.templates = new Map();
    this.loadingPromise = this.loadTemplates();
  }

  /**
   * Load all templates from the templates directory
   */
  async loadTemplates() {
    try {
      const files = await fs.readdir(this.templatesDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.templatesDir, file);
          const content = await fs.readFile(filePath, 'utf8');
          const template = JSON.parse(content);
          
          this.templates.set(template.id, template);
          console.log(`📋 Loaded template: ${template.name}`);
        } catch (error) {
          console.error(`❌ Error loading template ${file}:`, error.message);
        }
      }

      console.log(`✅ Loaded ${this.templates.size} templates`);
    } catch (error) {
      console.error('❌ Error loading templates:', error.message);
    }
  }

  /**
   * Get all available templates
   */
  async getAllTemplates() {
    try {
      await this.loadingPromise;
    } catch (error) {
      console.error('❌ Error waiting for templates to load:', error);
      return [];
    }
    
    return Array.from(this.templates.values()).map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      templateCount: template.templates.length
    }));
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId) {
    await this.loadingPromise;
    return this.templates.get(templateId);
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category) {
    await this.loadingPromise;
    return Array.from(this.templates.values())
      .filter(template => template.category === category)
      .map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        templateCount: template.templates.length
      }));
  }

  /**
   * Search for templates that match a description
   */
  async searchTemplates(query) {
    await this.loadingPromise;
    const searchTerm = query.toLowerCase();
    const results = [];

    for (const template of this.templates.values()) {
      // Search in template name and description
      if (template.name.toLowerCase().includes(searchTerm) || 
          template.description.toLowerCase().includes(searchTerm)) {
        results.push({
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          templateCount: template.templates.length
        });
      }

      // Search in individual template descriptions
      const matchingTemplates = template.templates.filter(t => 
        t.description.toLowerCase().includes(searchTerm)
      );

      if (matchingTemplates.length > 0) {
        results.push({
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          templateCount: template.templates.length,
          matchingTemplates: matchingTemplates
        });
      }
    }

    return results;
  }

  /**
   * Get suggested templates based on user input
   */
  async getSuggestedTemplates(userDescription) {
    try {
      await this.loadingPromise;
    } catch (error) {
      console.error('❌ Error waiting for templates to load:', error);
      return [];
    }
    
    const description = userDescription.toLowerCase();
    const suggestions = [];

    for (const template of this.templates.values()) {
      let relevanceScore = 0;
      const matchingTemplates = [];

      for (const templateItem of template.templates) {
        const templateDesc = templateItem.description.toLowerCase();
        let score = 0;

        // Check for keyword matches
        const keywords = [
          'motion', 'protective order', 'deposition', 'document', 'discovery',
          'plaintiff', 'defendant', 'memorandum', 'authorities', 'legal',
          'analyze', 'draft', 'review', 'research'
        ];

        keywords.forEach(keyword => {
          if (description.includes(keyword) && templateDesc.includes(keyword)) {
            score += 2;
          }
        });

        // Check for phrase matches
        if (description.includes('protective order') && templateDesc.includes('protective order')) {
          score += 5;
        }
        if (description.includes('deposition') && templateDesc.includes('deposition')) {
          score += 3;
        }
        if (description.includes('motion') && templateDesc.includes('motion')) {
          score += 3;
        }

        if (score > 0) {
          matchingTemplates.push({
            ...templateItem,
            relevanceScore: score
          });
          relevanceScore += score;
        }
      }

      if (relevanceScore > 0) {
        suggestions.push({
          id: template.id,
          name: template.name,
          description: template.description,
          category: template.category,
          relevanceScore,
          matchingTemplates: matchingTemplates.sort((a, b) => b.relevanceScore - a.relevanceScore)
        });
      }
    }

    return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get template suggestions for AI prompt
   */
  async getTemplateSuggestionsForPrompt(userDescription) {
    try {
      const suggestions = await this.getSuggestedTemplates(userDescription);
      
      console.log('🔍 Template suggestions debug:', {
        suggestionsType: typeof suggestions,
        isArray: Array.isArray(suggestions),
        length: suggestions?.length,
        firstItem: suggestions?.[0]
      });
      
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        return '';
      }

      let promptAddition = '\n\nRelevant billing templates to consider:\n';
      
      suggestions.slice(0, 3).forEach(suggestion => {
        promptAddition += `\n${suggestion.name}:\n`;
        if (suggestion.matchingTemplates && Array.isArray(suggestion.matchingTemplates)) {
          suggestion.matchingTemplates.slice(0, 3).forEach(template => {
            promptAddition += `- ${template.time}: ${template.description}\n`;
          });
        }
      });

      promptAddition += '\nUse these templates as reference for appropriate time estimates and professional language.';
      
      return promptAddition;
    } catch (error) {
      console.error('❌ Error in getTemplateSuggestionsForPrompt:', error);
      return '';
    }
  }
}

export default new TemplateService();
