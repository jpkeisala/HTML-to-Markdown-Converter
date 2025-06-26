import { JSDOM } from 'jsdom';
import config from './config';

/**
 * Class for preprocessing HTML before conversion to Markdown
 */
export class HtmlProcessor {
  /**
   * Process HTML content according to configuration
   * @param html HTML content
   * @param pageUrl The original page URL (for resolving relative media paths)
   * @returns Processed HTML
   */
  public static process(html: string, pageUrl?: string): string {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Apply selectors from config
      this.applySelectors(document);
      
      // Absolutize media URLs if pageUrl is provided
      if (pageUrl) {
        this.absolutizeMediaUrls(document, pageUrl);
      }
      
      return document.documentElement.outerHTML;
    } catch (error: any) {
      console.error(`Error processing HTML: ${error.message}`);
      return html; // Return original HTML if processing fails
    }
  }

  /**
   * Convert relative media URLs (img, audio, video, source) to absolute using the page's origin
   */
  private static absolutizeMediaUrls(document: Document, pageUrl: string): void {
    let origin: string;
    try {
      origin = new URL(pageUrl).origin;
    } catch {
      return;
    }
    // List of media tags and their src attributes
    const mediaTags = [
      { tag: 'img', attr: 'src' },
      { tag: 'audio', attr: 'src' },
      { tag: 'video', attr: 'src' },
      { tag: 'source', attr: 'src' },
      { tag: 'picture', attr: 'src' },
    ];
    for (const { tag, attr } of mediaTags) {
      const elements = document.getElementsByTagName(tag);
      for (const el of Array.from(elements)) {
        const val = el.getAttribute(attr);
        if (val && val.startsWith('/')) {
          // Avoid protocol-relative URLs (//example.com)
          if (!val.startsWith('//')) {
            el.setAttribute(attr, origin + val);
          }
        }
      }
    }
    // Also fix Markdown-style images in <a> or <img> alt attributes (rare, but for completeness)
    const markdownImageRegex = /!\[.*?\]\((\/[^)]+)\)/g;
    const anchors = document.getElementsByTagName('a');
    for (const anchor of Array.from(anchors)) {
      const href = anchor.getAttribute('href');
      if (href && href.startsWith('/')) {
        // Avoid protocol-relative URLs
        if (!href.startsWith('//')) {
          anchor.setAttribute('href', origin + href);
        }
      }
      // Fix Markdown-style image in alt attribute
      const alt = anchor.getAttribute('alt');
      if (alt) {
        anchor.setAttribute('alt', alt.replace(markdownImageRegex, (_, p1) => {
          return `![Image](${origin}${p1})`;
        }));
      }
    }
    const images = document.getElementsByTagName('img');
    for (const img of Array.from(images)) {
      const alt = img.getAttribute('alt');
      if (alt) {
        img.setAttribute('alt', alt.replace(markdownImageRegex, (_, p1) => {
          return `![Image](${origin}${p1})`;
        }));
      }
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
