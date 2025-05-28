import * as xml2js from 'xml2js';
import axios from 'axios';
import config from './config';

/**
 * Class for parsing XML sitemaps
 */
export class SitemapParser {
  /**
   * Parse a sitemap URL and extract all URLs
   * @param sitemapUrl URL of the sitemap
   * @returns Array of URLs found in the sitemap
   */
  public static async parseFromUrl(sitemapUrl: string): Promise<string[]> {
    try {
      console.log(`🔍 Fetching sitemap from: ${sitemapUrl}`);
      
      // Fetch the sitemap content
      const response = await axios.get(sitemapUrl, {
        timeout: config.timeout,
        headers: {
          'User-Agent': config.userAgent,
          'Accept': 'application/xml,text/xml,application/xhtml+xml,text/html;q=0.9'
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
      }
      
      // Parse the XML content
      const sitemapContent = response.data;
      return await this.parseSitemapContent(sitemapContent, sitemapUrl);
    } catch (error: any) {
      console.error(`Error parsing sitemap ${sitemapUrl}: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Parse sitemap content and extract all URLs
   * @param content XML sitemap content
   * @param baseUrl Base URL for resolving relative URLs in sitemapindex
   * @returns Array of URLs
   */
  private static async parseSitemapContent(content: string, baseUrl: string): Promise<string[]> {
    const parser = new xml2js.Parser({ explicitArray: false });
    try {
      const result = await parser.parseStringPromise(content);
      
      // Handle sitemap index (collection of sitemaps)
      if (result.sitemapindex) {
        console.log('📑 Detected sitemap index with multiple sitemaps');
        return await this.handleSitemapIndex(result.sitemapindex, baseUrl);
      }
      
      // Handle regular sitemap
      if (result.urlset) {
        return this.handleUrlset(result.urlset);
      }
      
      console.warn('⚠️ No valid sitemap format detected');
      return [];
    } catch (error: any) {
      console.error(`Error parsing XML content: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Handle sitemap index format (collection of sitemaps)
   * @param sitemapindex Parsed sitemap index
   * @param baseUrl Base URL for resolving relative URLs
   * @returns Flattened array of all URLs from all sitemaps
   */
  private static async handleSitemapIndex(sitemapindex: any, baseUrl: string): Promise<string[]> {
    const sitemaps = Array.isArray(sitemapindex.sitemap) 
      ? sitemapindex.sitemap 
      : [sitemapindex.sitemap];
    
    const allUrls: string[] = [];
    let processed = 0;
    const total = sitemaps.length;
    
    console.log(`📊 Found ${total} sitemaps in the sitemap index`);
    
    // Process each sitemap with concurrency control
    for (let i = 0; i < total; i += config.maxConcurrent) {
      const batch = sitemaps.slice(i, i + config.maxConcurrent);
      const promises = batch.map(async (sitemap: any) => {
        if (sitemap.loc) {
          // Make sure the URL is absolute
          const sitemapUrl = new URL(sitemap.loc, baseUrl).toString();
          const urls = await this.parseFromUrl(sitemapUrl);
          return urls;
        }
        return [];
      });
      
      const results = await Promise.all(promises);
      results.forEach(urls => allUrls.push(...urls));
      
      processed += batch.length;
      console.log(`📈 Processed ${processed}/${total} sitemaps (${Math.round((processed / total) * 100)}%)`);
    }
    
    return allUrls;
  }
  
  /**
   * Handle urlset format (regular sitemap)
   * @param urlset Parsed urlset
   * @returns Array of URLs
   */
  private static handleUrlset(urlset: any): string[] {
    if (!urlset.url) {
      return [];
    }
    
    const urls = Array.isArray(urlset.url) ? urlset.url : [urlset.url];
    const extractedUrls = urls
      .filter((urlEntry: any) => urlEntry.loc) // Ensure we have a URL
      .map((urlEntry: any) => urlEntry.loc.trim());
    
    console.log(`📄 Found ${extractedUrls.length} URLs in sitemap`);
    return extractedUrls;
  }
}
