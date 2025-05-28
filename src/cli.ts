#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { Config, configManager } from './config';

/**
 * Simple CLI handling for configuration options
 */
export function processCLI(): Config {
  const args = process.argv.slice(2);
  let configUpdated = false;
  const config = configManager.getConfig();

  // Helper for showing help
  const showHelp = () => {
    console.log(`HTML to Markdown Converter

Usage: node index.js [options]

Options:
  --help, -h                    Show this help message
  --output-dir=DIR, -o=DIR      Set output directory
  --url-file=FILE, -f=FILE      Set URL file source
  --sitemap=URL, -s=URL         Set sitemap URL source
  --max-concurrent=NUM, -c=NUM  Set maximum concurrent downloads
  --use-titles, -t              Use page titles for filenames
  --use-url-paths, -u           Use URL paths for filenames
  --domain-folders, -d          Organize by domain folders
  --flat-structure, -n          Use flat folder structure

Examples:
  node index.js --output-dir=output --sitemap=https://example.com/sitemap.xml
  node index.js --url-file=myurls.txt --use-titles --flat-structure
`);
    process.exit(0);
  };

  // Process each argument
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      showHelp();
    }
    
    // Output directory
    else if (arg.startsWith('--output-dir=')) {
      config.outputDir = arg.split('=')[1];
      configUpdated = true;
    }
    else if (arg === '-o' && i + 1 < args.length) {
      config.outputDir = args[++i];
      configUpdated = true;
    }
    
    // URL file
    else if (arg.startsWith('--url-file=')) {
      config.urlSource.type = 'file';
      config.urlSource.file = arg.split('=')[1];
      configUpdated = true;
    }
    else if (arg === '-f' && i + 1 < args.length) {
      config.urlSource.type = 'file';
      config.urlSource.file = args[++i];
      configUpdated = true;
    }
    
    // Sitemap URL
    else if (arg.startsWith('--sitemap=')) {
      config.urlSource.type = 'sitemap';
      config.urlSource.sitemap = arg.split('=')[1];
      configUpdated = true;
    }
    else if (arg === '-s' && i + 1 < args.length) {
      config.urlSource.type = 'sitemap';
      config.urlSource.sitemap = args[++i];
      configUpdated = true;
    }
    
    // Max concurrent
    else if (arg.startsWith('--max-concurrent=')) {
      const value = parseInt(arg.split('=')[1], 10);
      if (!isNaN(value)) {
        config.maxConcurrent = value;
        configUpdated = true;
      }
    }
    else if (arg === '-c' && i + 1 < args.length) {
      const value = parseInt(args[++i], 10);
      if (!isNaN(value)) {
        config.maxConcurrent = value;
        configUpdated = true;
      }
    }
    
    // Use page titles
    else if (arg === '--use-titles' || arg === '-t') {
      config.fileOptions.usePageTitlesForFilenames = true;
      config.fileOptions.preserveUrlFilenames = false;
      configUpdated = true;
    }
    
    // Use URL paths
    else if (arg === '--use-url-paths' || arg === '-u') {
      config.fileOptions.usePageTitlesForFilenames = false;
      config.fileOptions.preserveUrlFilenames = true;
      configUpdated = true;
    }
    
    // Domain folders
    else if (arg === '--domain-folders' || arg === '-d') {
      config.fileOptions.useDomainSubfolders = true;
      configUpdated = true;
    }
    
    // Flat structure
    else if (arg === '--flat-structure' || arg === '-n') {
      config.fileOptions.useDomainSubfolders = false;
      configUpdated = true;
    }
    
    else if (arg.startsWith('--')) {
      console.warn(`Unknown option: ${arg}`);
    }
  }
  
  // If we updated the config, tell the user
  if (configUpdated) {
    console.log('⚙️ Command-line options applied');
  }
  
  return config;
}
