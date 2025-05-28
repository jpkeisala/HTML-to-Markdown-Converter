import * as fs from 'fs';
import * as path from 'path';
import * as fsExtra from 'fs-extra';
import TurndownService from 'turndown';
import axios from 'axios';
import sanitize from 'sanitize-filename';
import { HtmlProcessor } from './htmlProcessor';
import { SitemapParser } from './sitemapParser';
import config, { configManager } from './config';
import { processCLI } from './cli';

// Process command line arguments
const cliConfig = processCLI();

// Configuration from config file and CLI overrides
const OUTPUT_DIR = cliConfig.outputDir;
const MAX_CONCURRENT = cliConfig.maxConcurrent;
const TIMEOUT = cliConfig.timeout;
const RETRY_ATTEMPTS = cliConfig.retryAttempts;
const RETRY_DELAY = cliConfig.retryDelay;

/**
 * Gets URLs from the configured source (file or sitemap)
 * @returns {Promise<string[]>} Array of URLs
 */
async function getUrls(): Promise<string[]> {
  // Check which source to use
  if (config.urlSource.type === 'sitemap' && config.urlSource.sitemap) {
    return getSitemapUrls(config.urlSource.sitemap);
  } else {
    return getFileUrls(config.urlSource.file);
  }
}

/**
 * Reads URLs from a file and returns them as an array
 * @param {string} filePath Path to the URLs file
 * @returns {Promise<string[]>} Array of URLs
 */
async function getFileUrls(filePath: string): Promise<string[]> {
  try {
    console.log(`📋 Reading URLs from file: ${filePath}`);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const urls = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//'));
    
    console.log(`📊 Found ${urls.length} URLs in file`);
    return urls;
  } catch (error: any) {
    console.error(`❌ Error reading URLs file: ${error.message}`);
    return [];
  }
}

/**
 * Fetches URLs from a sitemap URL
 * @param {string} sitemapUrl URL of the sitemap
 * @returns {Promise<string[]>} Array of URLs
 */
async function getSitemapUrls(sitemapUrl: string): Promise<string[]> {
  try {
    console.log(`🌐 Fetching URLs from sitemap: ${sitemapUrl}`);
    const urls = await SitemapParser.parseFromUrl(sitemapUrl);
    console.log(`📊 Found ${urls.length} URLs in sitemap`);
    return urls;
  } catch (error: any) {
    console.error(`❌ Error fetching sitemap: ${error.message}`);
    return [];
  }
}

/**
 * Parses a URL and returns path information for creating folder structure and filename
 * @param {string} url URL to parse
 * @returns {Object} Object with domain, path array, and filename
 */
function parseUrl(url: string): { domain: string; pathParts: string[]; filename: string; originalUrl: string; } {
  try {
    // Create a URL object to properly parse the URL
    const urlObj = new URL(url);
    
    // Get hostname without www
    const domain = urlObj.hostname.replace(/^www\./, '');
    
    // Parse the pathname
    let pathname = urlObj.pathname.replace(/^\/|\/$/g, '');
    
    // Handle common file extensions that should be preserved in the filename
    const fileExtensions = ['.html', '.htm', '.php', '.asp', '.aspx', '.jsp'];
    let hasExtension = false;
    
    for (const ext of fileExtensions) {
      if (pathname.toLowerCase().endsWith(ext)) {
        pathname = pathname.slice(0, -ext.length);
        hasExtension = true;
        break;
      }
    }
    
    // Split the pathname into parts
    const pathParts = pathname ? pathname.split('/').filter(Boolean) : [];
    
    // Determine filename - use the last path part or 'index' for the root path
    let filename = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'index';
    
    // Handle URL with query parameters
    if (urlObj.search) {
      if (config.fileOptions.preserveUrlFilenames) {
        // Add all query parameters to the filename to ensure uniqueness
        const queryStr = urlObj.search.replace(/^\?/, '');
        // Create a hash of the query string to avoid extremely long filenames
        if (queryStr.length > 0) {
          // Simple hash function for shorter filenames
          const hashCode = (s: string) => {
            let hash = 0;
            for (let i = 0; i < s.length; i++) {
              const char = s.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(16); // Convert to hex
          };
          
          const queryHash = hashCode(queryStr);
          filename = `${filename}-${queryHash}`;
        }
      } else {
        // Create a more descriptive filename from specific query parameters
        const searchParams = new URLSearchParams(urlObj.search);
        const keyParam = searchParams.get('id') || searchParams.get('page') || searchParams.get('slug');
        if (keyParam) {
          filename = `${filename}-${sanitize(keyParam)}`;
        }
      }
    }
    
    // Clean up the filename
    filename = sanitize(filename);
    if (!filename) filename = 'index';
    
    // Remove filename from pathParts if it exists
    if (pathParts.length > 0) {
      pathParts.pop();
    }
    
    return {
      domain,
      pathParts,
      filename: `${filename}.md`,
      originalUrl: url // Keep the original URL for reference
    };
  } catch (error) {
    // Fallback if URL parsing fails
    const sanitizedUrl = url
      .replace(/^https?:\/\/(www\.)?/, '')
      .split(/[?#]/)[0]
      .replace(/\/$/, '');
      
    const parts = sanitizedUrl.split('/');
    const domain = parts[0];
    const pathParts = parts.slice(1, -1);
    const filename = parts.length > 1 ? parts[parts.length - 1] : 'index';
    
    return {
      domain,
      pathParts,
      filename: `${sanitize(filename || 'index')}.md`,
      originalUrl: url
    };
  }
}

/**
 * Gets the full output path for a URL
 * @param {string} url URL to convert
 * @param {string} pageTitle Optional page title to use for filename
 * @returns {Object} Object with directory path and full file path
 */
function getOutputPaths(url: string, pageTitle?: string | null): { dirPath: string; filePath: string } {
  const { domain, pathParts, filename: defaultFilename } = parseUrl(url);
  
  // Create the directory structure
  const domainDir = sanitize(domain);
  const pathDirs = pathParts.map(part => sanitize(part));
  
  // Use domain subfolders if configured, otherwise flatten structure
  let dirParts: string[];
  if (config.fileOptions.useDomainSubfolders) {
    dirParts = [OUTPUT_DIR, domainDir, ...pathDirs];
  } else {
    dirParts = [OUTPUT_DIR, ...pathDirs];
  }
  
  const dirPath = path.join(...dirParts);
  
  // Use page title for filename if configured and available, unless preserveUrlFilenames is true
  let filename = defaultFilename;
  if (config.fileOptions.usePageTitlesForFilenames && pageTitle && !config.fileOptions.preserveUrlFilenames) {
    // Replace invalid filename characters and trim length
    let titleFilename = sanitize(pageTitle);
    
    // Limit filename length (max 100 chars)
    if (titleFilename.length > 100) {
      titleFilename = titleFilename.substring(0, 100);
    }
    
    // Only use title if it's not empty after sanitization
    if (titleFilename) {
      filename = `${titleFilename}.md`;
    }
  }
  
  return {
    dirPath,
    filePath: path.join(dirPath, filename)
  };
}

/**
 * Fetches HTML content from a URL
 * @param {string} url URL to fetch
 * @returns {Promise<string>} HTML content
 */
async function fetchHtmlContent(url: string, retryCount = 0): Promise<string> {
  try {
    console.log(`Fetching: ${url}`);
    
    const response = await axios.get(url, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': config.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch HTML content: ${response.statusText}`);
    }
    
    return response.data;
  } catch (error: any) {
    if (retryCount < RETRY_ATTEMPTS) {
      console.warn(`Error fetching ${url}, retrying (${retryCount + 1}/${RETRY_ATTEMPTS}): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchHtmlContent(url, retryCount + 1);
    } else {
      console.error(`Failed to fetch ${url} after ${RETRY_ATTEMPTS} attempts: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Converts HTML to Markdown using Turndown
 * @param {string} url URL to convert
 * @returns {Promise<string>} Markdown content
 */
async function convertHtmlToMarkdown(url: string, retryCount = 0): Promise<string> {
  try {
    console.log(`Converting: ${url}`);
    
    // Fetch HTML content
    let htmlContent = await fetchHtmlContent(url);
    
    // Process HTML using the HTML processor
    htmlContent = HtmlProcessor.process(htmlContent);
    
    // Set up Turndown with default options first
    const turndownService = new TurndownService();
    
    // Apply options manually to avoid TypeScript issues with strict types
    const options = config.turndownOptions;
    turndownService.options.headingStyle = options.headingStyle;
    turndownService.options.hr = options.hr;
    turndownService.options.bulletListMarker = options.bulletListMarker;
    turndownService.options.codeBlockStyle = options.codeBlockStyle;
    turndownService.options.emDelimiter = options.emDelimiter as any;
    turndownService.options.linkStyle = options.linkStyle;
    turndownService.options.strongDelimiter = options.strongDelimiter as any;
    
    // Add rules to improve conversion
    turndownService.addRule('removeComments', {
      filter: function(node) {
        return node.nodeType === 8; // Comment node
      },
      replacement: function() {
        return '';
      }
    });
    
    // Preserve line breaks
    turndownService.addRule('lineBreaks', {
      filter: ['br'],
      replacement: function() {
        return '\n';
      }
    });
    
    // Handle tables better
    turndownService.addRule('tableStyle', {
      filter: ['table'],
      replacement: function(content) {
        return '\n\n' + content + '\n\n';
      }
    });
    
    // Convert HTML to Markdown
    const markdownContent = turndownService.turndown(htmlContent);
    
    if (!markdownContent) {
      throw new Error('Failed to convert HTML to markdown');
    }
    
    // Build the final markdown content
    let finalContent = '';
    
    // Add source URL if configured
    if (config.fileOptions.addSourceUrl) {
      finalContent += `<!-- Source: ${url} -->\n\n`;
    }
    
    // Add date if configured
    if (config.fileOptions.addDate) {
      const now = new Date();
      finalContent += `<!-- Generated: ${now.toISOString()} -->\n\n`;
    }
    
    // Add the markdown content
    finalContent += markdownContent;
    
    return finalContent;
  } catch (error: any) {
    if (retryCount < RETRY_ATTEMPTS) {
      console.warn(`Error converting ${url}, retrying (${retryCount + 1}/${RETRY_ATTEMPTS}): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return convertHtmlToMarkdown(url, retryCount + 1);
    } else {
      console.error(`Failed to convert ${url} after ${RETRY_ATTEMPTS} attempts: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Converts already fetched HTML content to Markdown using Turndown
 * @param {string} url Source URL (for metadata)
 * @param {string} htmlContent HTML content to convert
 * @returns {Promise<string>} Markdown content
 */
async function convertHtmlWithContent(url: string, htmlContent: string): Promise<string> {
  try {
    console.log(`Converting already fetched HTML: ${url}`);
    
    // Set up Turndown with default options first
    const turndownService = new TurndownService();
    
    // Apply options manually to avoid TypeScript issues with strict types
    const options = config.turndownOptions;
    turndownService.options.headingStyle = options.headingStyle;
    turndownService.options.hr = options.hr;
    turndownService.options.bulletListMarker = options.bulletListMarker;
    turndownService.options.codeBlockStyle = options.codeBlockStyle;
    turndownService.options.emDelimiter = options.emDelimiter as any;
    turndownService.options.linkStyle = options.linkStyle;
    turndownService.options.strongDelimiter = options.strongDelimiter as any;
    
    // Add rules to improve conversion
    turndownService.addRule('removeComments', {
      filter: function(node) {
        return node.nodeType === 8; // Comment node
      },
      replacement: function() {
        return '';
      }
    });
    
    // Preserve line breaks
    turndownService.addRule('lineBreaks', {
      filter: ['br'],
      replacement: function() {
        return '\n';
      }
    });
    
    // Handle tables better
    turndownService.addRule('tableStyle', {
      filter: ['table'],
      replacement: function(content) {
        return '\n\n' + content + '\n\n';
      }
    });
    
    // Convert HTML to Markdown
    const markdownContent = turndownService.turndown(htmlContent);
    
    if (!markdownContent) {
      throw new Error('Failed to convert HTML to markdown');
    }
    
    // Build the final markdown content
    let finalContent = '';
    
    // Add source URL if configured
    if (config.fileOptions.addSourceUrl) {
      finalContent += `<!-- Source: ${url} -->\n\n`;
    }
    
    // Add date if configured
    if (config.fileOptions.addDate) {
      const now = new Date();
      finalContent += `<!-- Generated: ${now.toISOString()} -->\n\n`;
    }
    
    // Add the markdown content
    finalContent += markdownContent;
    
    return finalContent;
  } catch (error: any) {
    console.error(`Error converting HTML content: ${error.message}`);
    throw error;
  }
}

/**
 * Processes a URL to convert it to markdown and save to disk
 * @param {string} url URL to process
 */
async function processUrl(url: string): Promise<void> {
  try {
    // Fetch HTML first to extract title if needed
    let pageTitle: string | null = null;
    let htmlContent: string | null = null;
    
    if (config.fileOptions.usePageTitlesForFilenames) {
      console.log(`Fetching HTML to extract title: ${url}`);
      htmlContent = await fetchHtmlContent(url);
      pageTitle = HtmlProcessor.extractPageTitle(htmlContent);
      
      if (pageTitle) {
        console.log(`Found page title: "${pageTitle}"`);
      } else {
        console.log(`No page title found, using default filename`);
      }
    }
    
    // Get output paths using the page title if available
    const { dirPath, filePath } = getOutputPaths(url, pageTitle);
    
    // Convert to markdown (reuse already fetched HTML if available)
    let markdown: string;
    if (htmlContent) {
      // Process HTML using the HTML processor
      const processedHtml = HtmlProcessor.process(htmlContent);
      markdown = await convertHtmlWithContent(url, processedHtml);
    } else {
      markdown = await convertHtmlToMarkdown(url);
    }
    
    // Ensure directory structure exists
    await fsExtra.ensureDir(dirPath);
    
    // Write markdown to file
    await fs.promises.writeFile(filePath, markdown, 'utf-8');
    console.log(`✅ Saved: ${filePath}`);
  } catch (error: any) {
    console.error(`❌ Error processing ${url}: ${error.message}`);
  }
}

/**
 * Process URLs in batches to limit concurrency
 * @param {string[]} urls Array of URLs to process
 */
async function processUrlsInBatches(urls: string[]): Promise<void> {
  let completed = 0;
  const total = urls.length;
  
  // Process URLs in batches to limit concurrency
  for (let i = 0; i < total; i += MAX_CONCURRENT) {
    const batch = urls.slice(i, i + MAX_CONCURRENT);
    await Promise.all(batch.map(url => processUrl(url)));
    
    completed += batch.length;
    const percentage = Math.round((completed / total) * 100);
    console.log(`Progress: ${completed}/${total} (${percentage}%)`);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting HTML to Markdown conversion');
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    console.log(`🔧 Using configuration with ${config.selectors.exclude.length} exclude selectors`);
    console.log(`📂 File organization: ${cliConfig.fileOptions.useDomainSubfolders ? 'Domain subfolders' : 'Flat structure'}`);
    
    // Show filename strategy
    if (cliConfig.fileOptions.preserveUrlFilenames) {
      console.log(`📄 Filenames: Using URL paths with query parameters`);
    } else if (cliConfig.fileOptions.usePageTitlesForFilenames) {
      console.log(`📄 Filenames: Using page titles when available`);
    } else {
      console.log(`📄 Filenames: Using simple URL paths`);
    }
    
    // Show URL source
    if (cliConfig.urlSource.type === 'sitemap') {
      console.log(`🔗 URL source: Sitemap XML (${cliConfig.urlSource.sitemap})`);
    } else {
      console.log(`🔗 URL source: File (${cliConfig.urlSource.file})`);
    }
    
    // Ensure output directory exists
    await fsExtra.ensureDir(OUTPUT_DIR);
    
    // Get URLs from configured source
    const urls = await getUrls();
    
    if (urls.length === 0) {
      console.warn('⚠️ No URLs found in file');
      return;
    }
    
    console.log(`📋 Found ${urls.length} URLs to process`);
    
    // Process URLs
    await processUrlsInBatches(urls);
    
    console.log('✨ Conversion completed successfully');
  } catch (error: any) {
    console.error(`🔥 Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run the app
main().catch(console.error);
