import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration interface for HTML to Markdown conversion
 */
export interface Config {
  outputDir: string;
  maxConcurrent: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  urlSource: {
    type: 'file' | 'sitemap';
    file: string;
    sitemap: string;
  };
  selectors: {
    exclude: string[];
    unwrap: string[];
    removeAttributes: boolean;
  };
  turndownOptions: {
    headingStyle: 'atx' | 'setext';
    hr: string;
    bulletListMarker: '-' | '*' | '+';
    codeBlockStyle: 'indented' | 'fenced';
    emDelimiter: '*' | '_';
    linkStyle: 'inlined' | 'referenced';
    strongDelimiter: '**' | '__';
  };
  userAgent: string;
  fileOptions: {
    addSourceUrl: boolean;
    addDate: boolean;
    useDomainSubfolders: boolean;
    usePageTitlesForFilenames: boolean;
    preserveUrlFilenames: boolean;
  };
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: Config = {
  outputDir: 'dist',
  maxConcurrent: 3,
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 3000,
  urlSource: {
    type: 'file',
    file: 'urls.txt',
    sitemap: ''
  },
  selectors: {
    exclude: ['footer', 'header', 'nav', 'script', '.cookie-banner', '#sidebar'],
    unwrap: ['.container', '.wrapper'],
    removeAttributes: true
  },
  turndownOptions: {
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    linkStyle: 'referenced',
    strongDelimiter: '**'
  },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
  fileOptions: {
    addSourceUrl: true,
    addDate: true,
    useDomainSubfolders: true,
    usePageTitlesForFilenames: false,
    preserveUrlFilenames: true
  }
};

/**
 * Configuration loader and manager
 */
export class ConfigManager {
  private config: Config;
  private configPath: string;

  /**
   * Constructor
   * @param configPath Path to configuration file
   */
  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config.json');
    this.config = { ...DEFAULT_CONFIG };
    this.loadConfig();
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');
        const fileConfig = JSON.parse(fileContent);
        
        // Merge with default config
        this.config = this.mergeConfigs(this.config, fileConfig);
        
        console.log(`✅ Configuration loaded from ${this.configPath}`);
      } else {
        console.log(`ℹ️ No configuration file found at ${this.configPath}, using defaults`);
        this.saveConfig(); // Create default config file
      }
    } catch (error: any) {
      console.error(`❌ Error loading configuration: ${error.message}`);
      console.log('ℹ️ Using default configuration');
    }
  }

  /**
   * Save configuration to file
   */
  public saveConfig(): void {
    try {
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
      console.log(`✅ Configuration saved to ${this.configPath}`);
    } catch (error: any) {
      console.error(`❌ Error saving configuration: ${error.message}`);
    }
  }

  /**
   * Get the current configuration
   */
  public getConfig(): Config {
    return this.config;
  }

  /**
   * Update configuration with new values
   * @param newConfig New configuration values
   */
  public updateConfig(newConfig: Partial<Config>): void {
    this.config = this.mergeConfigs(this.config, newConfig);
    this.saveConfig();
  }

  /**
   * Deep merge configuration objects
   * @param target Target object
   * @param source Source object
   * @returns Merged object
   */
  private mergeConfigs(target: any, source: any): any {
    const output = { ...target };
    
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.mergeConfigs(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }
}

/**
 * Check if value is an object
 * @param item Value to check
 * @returns True if object
 */
function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// Export default instance
export const configManager = new ConfigManager();
export default configManager.getConfig();
