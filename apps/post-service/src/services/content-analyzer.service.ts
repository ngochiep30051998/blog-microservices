import { Injectable } from '@nestjs/common';

export interface ContentAnalysis {
  wordCount: number;
  readingTime: number; // in minutes
  headings: {
    level: number;
    text: string;
    id: string;
  }[];
  excerpt?: string;
}

@Injectable()
export class ContentAnalyzerService {
  /**
   * Analyze content for word count, reading time, and structure
   */
  analyzeContent(content: string, contentType: 'markdown' | 'html' | 'rich_text' = 'markdown'): ContentAnalysis {
    let plainText = this.extractPlainText(content, contentType);
    const wordCount = this.countWords(plainText);
    const readingTime = this.calculateReadingTime(wordCount);
    const headings = this.extractHeadings(content, contentType);

    return {
      wordCount,
      readingTime,
      headings,
    };
  }

  /**
   * Generate excerpt from content
   */
  generateExcerpt(content: string, contentType: 'markdown' | 'html' | 'rich_text' = 'markdown', maxLength: number = 160): string {
    const plainText = this.extractPlainText(content, contentType);
    const sentences = plainText.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
    
    let excerpt = '';
    for (const sentence of sentences) {
      const testExcerpt = excerpt + (excerpt ? ' ' : '') + sentence.trim() + '.';
      if (testExcerpt.length > maxLength) {
        break;
      }
      excerpt = testExcerpt;
    }

    return excerpt || plainText.substring(0, maxLength) + (plainText.length > maxLength ? '...' : '');
  }

  /**
   * Extract SEO keywords from content
   */
  extractKeywords(content: string, title: string = '', maxKeywords: number = 10): string[] {
    const plainText = this.extractPlainText(content, 'markdown');
    const text = (title + ' ' + plainText).toLowerCase();
    
    // Remove common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ]);

    // Extract words (minimum 3 characters)
    const words = text.match(/\b[a-z]{3,}\b/g) || [];
    const wordFreq = new Map<string, number>();

    words.forEach(word => {
      if (!stopWords.has(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });

    // Sort by frequency and return top keywords
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Validate and optimize SEO fields
   */
  optimizeSEO(title: string, description?: string, content?: string): {
    metaTitle: string;
    metaDescription: string;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    
    // Optimize meta title
    let metaTitle = title;
    if (title.length > 60) {
      metaTitle = title.substring(0, 57) + '...';
      suggestions.push('Title is too long for SEO (>60 chars). Consider shortening.');
    } else if (title.length < 30) {
      suggestions.push('Title might be too short for SEO (<30 chars). Consider adding descriptive words.');
    }

    // Optimize meta description
    let metaDescription = description || '';
    if (!metaDescription && content) {
      metaDescription = this.generateExcerpt(content, 'markdown', 155);
    }
    if (metaDescription.length > 160) {
      metaDescription = metaDescription.substring(0, 157) + '...';
      suggestions.push('Meta description is too long (>160 chars). Truncated automatically.');
    } else if (metaDescription.length < 120) {
      suggestions.push('Meta description could be longer for better SEO (120-160 chars optimal).');
    }

    return {
      metaTitle,
      metaDescription,
      suggestions,
    };
  }

  /**
   * Extract plain text from different content types
   */
  private extractPlainText(content: string, contentType: 'markdown' | 'html' | 'rich_text'): string {
    switch (contentType) {
      case 'html':
        return content
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<style[^>]*>.*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      case 'markdown':
        return content
          .replace(/^#{1,6}\s+/gm, '') // Remove heading markers
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
          .replace(/\*(.*?)\*/g, '$1') // Remove italic
          .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove code blocks
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Extract link text
          .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
          .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
          .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
          .replace(/\s+/g, ' ')
          .trim();

      case 'rich_text':
        // Assume rich_text is similar to HTML
        return this.extractPlainText(content, 'html');

      default:
        return content.replace(/\s+/g, ' ').trim();
    }
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calculate reading time based on average reading speed (200 WPM)
   */
  private calculateReadingTime(wordCount: number): number {
    const averageWPM = 200;
    return Math.max(1, Math.round(wordCount / averageWPM));
  }

  /**
   * Extract headings from content
   */
  private extractHeadings(content: string, contentType: 'markdown' | 'html' | 'rich_text'): {
    level: number;
    text: string;
    id: string;
  }[] {
    const headings: { level: number; text: string; id: string }[] = [];

    if (contentType === 'markdown') {
      const headingMatches = content.match(/^(#{1,6})\s+(.+)$/gm) || [];
      headingMatches.forEach(match => {
        const levelMatch = match.match(/^(#{1,6})/);
        const textMatch = match.match(/^#{1,6}\s+(.+)$/);
        
        if (levelMatch && textMatch) {
          const level = levelMatch[1].length;
          const text = textMatch[1].trim();
          const id = this.generateHeadingId(text);
          headings.push({ level, text, id });
        }
      });
    } else if (contentType === 'html' || contentType === 'rich_text') {
      const headingMatches = content.match(/<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/gi) || [];
      headingMatches.forEach(match => {
        const levelMatch = match.match(/<h([1-6])/i);
        const textMatch = match.match(/>([^<]+)</);
        
        if (levelMatch && textMatch) {
          const level = parseInt(levelMatch[1]);
          const text = textMatch[1].trim();
          const id = this.generateHeadingId(text);
          headings.push({ level, text, id });
        }
      });
    }

    return headings;
  }

  /**
   * Generate URL-friendly ID from heading text
   */
  private generateHeadingId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s]+/g, '-')
      .replace(/-+/g, '-');
  }
}