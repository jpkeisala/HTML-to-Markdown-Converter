import { JSDOM } from 'jsdom';
import config from './config';

/**
 * Class for preprocessing HTML before conversion to Markdown
 */
export class HtmlProcessor {
  /**
   * Process HTML content according to configuration
   * @param html HTML content
   * @returns Processed HTML
   */
  public static process(html: string): string {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Apply selectors from config
      this.applySelectors(document);
      
      return document.documentElement.outerHTML;
    } catch (error: any) {
      console.error(`Error processing HTML: ${error.message}`);
      return html; // Return original HTML if processing fails
    }
  }

  /**
   * Apply selector rules from configuration
   * @param document DOM document
   */
  private static applySelectors(document: Document): void {
    // Process exclude selectors - remove elements from DOM
    this.processExcludeSelectors(document);
    
    // Process unwrap selectors - keep content but remove container
    this.processUnwrapSelectors(document);
    
    // Remove attributes if configured
    if (config.selectors.removeAttributes) {
      this.removeAttributes(document);
    }
  }

  /**
   * Remove elements matching exclude selectors
   * @param document DOM document
   */
  private static processExcludeSelectors(document: Document): void {
    if (!config.selectors.exclude || !config.selectors.exclude.length) return;
    
    // Create combined selector for all exclusions
    const selector = config.selectors.exclude.join(', ');
    
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
      });
    } catch (error: any) {
      console.error(`Error processing exclude selectors: ${error.message}`);
    }
  }

  /**
   * Unwrap elements matching unwrap selectors (keep contents)
   * @param document DOM document
   */
  private static processUnwrapSelectors(document: Document): void {
    if (!config.selectors.unwrap || !config.selectors.unwrap.length) return;
    
    // Create combined selector for all unwraps
    const selector = config.selectors.unwrap.join(', ');
    
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (element.parentNode) {
          // Move all children before the element itself
          while (element.firstChild) {
            element.parentNode.insertBefore(element.firstChild, element);
          }
          // Remove the now-empty element
          element.parentNode.removeChild(element);
        }
      });
    } catch (error: any) {
      console.error(`Error processing unwrap selectors: ${error.message}`);
    }
  }

  /**
   * Remove most attributes from elements except important ones
   * @param document DOM document
   */
  private static removeAttributes(document: Document): void {
    try {
      const elements = document.querySelectorAll('*');
      const keepAttributes = ['href', 'src', 'alt', 'title'];
      
      elements.forEach(element => {
        const attributes = Array.from(element.attributes);
        attributes.forEach(attr => {
          if (!keepAttributes.includes(attr.name)) {
            element.removeAttribute(attr.name);
          }
        });
      });
    } catch (error: any) {
      console.error(`Error removing attributes: ${error.message}`);
    }
  }

  /**
   * Extract the page title from an HTML document
   * @param html HTML content
   * @returns Page title or null if not found
   */
  public static extractPageTitle(html: string): string | null {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Try to get title from the title tag
      const titleElement = document.querySelector('title');
      if (titleElement && titleElement.textContent) {
        return titleElement.textContent.trim();
      }
      
      // If no title tag, try to get from the first h1
      const h1Element = document.querySelector('h1');
      if (h1Element && h1Element.textContent) {
        return h1Element.textContent.trim();
      }
      
      // If still no title, try meta title
      const metaTitle = document.querySelector('meta[name="title"]');
      if (metaTitle && metaTitle.getAttribute('content')) {
        return metaTitle.getAttribute('content')!.trim();
      }
      
      // No title found
      return null;
    } catch (error: any) {
      console.error(`Error extracting page title: ${error.message}`);
      return null;
    }
  }
}
