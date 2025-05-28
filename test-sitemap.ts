import { SitemapParser } from './src/sitemapParser';

async function testSitemapParser() {
  console.log('Testing sitemap parser...');
  
  // Example sitemaps
  const sitemaps = [
    'https://jpkeisala.com/wp-sitemap.xml', // WordPress sitemap index
    'https://euronomy.eu/sitemap.xml'       // Standard sitemap
  ];
  
  for (const sitemap of sitemaps) {
    console.log(`\nTesting sitemap: ${sitemap}`);
    
    try {
      const urls = await SitemapParser.parseFromUrl(sitemap);
      console.log(`Found ${urls.length} URLs in sitemap`);
      
      // Print first 5 URLs as a sample
      console.log('Sample URLs:');
      urls.slice(0, 5).forEach(url => console.log(` - ${url}`));
      
      if (urls.length > 5) {
        console.log(`... and ${urls.length - 5} more`);
      }
    } catch (error) {
      console.error(`Error parsing sitemap: ${error instanceof Error ? error.message : error}`);
    }
  }
}

testSitemapParser().catch(console.error);
