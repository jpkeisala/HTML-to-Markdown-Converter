# HTML to Markdown Converter

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Axios](https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white)](https://axios-http.com/)
[![npm](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/)

A Node.js application that crawls and converts web pages to Markdown format, designed specifically for creating high-quality content for Large Language Models (LLMs). This tool helps you build custom knowledge bases by converting web content to clean, formatted Markdown that's optimized for context ingestion by LLMs.

## Features

- Reads URLs from a text file or XML sitemap
- Converts HTML web pages to Markdown format using [Turndown](https://github.com/mixmark-io/turndown)
- Saves converted Markdown files to a local directory
- Processes multiple URLs concurrently
- Implements retry logic for failed conversions
- Handles errors gracefully
- Supports sitemap index files that contain multiple sitemaps
- Organizes output to match URL directory structure
- Supports various filename options (URL paths or page titles)
- Preserves query parameters in URLs for unique filenames

## Prerequisites

- Node.js (v14 or later)
- npm or yarn

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd crawl-web-to-md
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```
This compiles the TypeScript code into JavaScript in the `dist` directory.

## Dependencies

This project uses the following main packages:
- **turndown**: Converts HTML to Markdown
- **axios**: Fetches HTML content from URLs
- **fs-extra**: Enhanced file system operations
- **sanitize-filename**: Creates safe file names for different operating systems

## Usage

### Using a URL List

1. Add URLs to the `urls.txt` file, one URL per line:
```
https://example.com/
https://example.com/about
https://example.com/contact
```

2. Configure `config.json` to use the URL file:
```json
"urlSource": {
  "type": "file",
  "file": "urls.txt",
  "sitemap": ""
}
```

3. Run the application:
```bash
# Development mode (using ts-node, no build required)
npm start

# OR use the built version (after running npm run build)
node dist/index.js
```

### Using an XML Sitemap

1. Configure `config.json` to use a sitemap URL:
```json
"urlSource": {
  "type": "sitemap",
  "file": "urls.txt",
  "sitemap": "https://example.com/sitemap.xml"
}
```

2. Run the application:
```bash
# Development mode (using ts-node, no build required)
npm start

# OR use the built version (after running npm run build)
node dist/index.js
```

The converted Markdown files will be saved in the `dist` directory.

### Command-Line Options

You can also specify options directly from the command line:

```bash
# First build the project if you haven't already
npm run build

# Use a sitemap as the URL source
node dist/index.js --sitemap=https://example.com/sitemap.xml

# Use a URL file and output to a different directory
node dist/index.js --url-file=myurls.txt --output-dir=output

# Use page titles for filenames and a flat folder structure
node dist/index.js --use-titles --flat-structure

# Process URLs from a sitemap with more concurrent requests
node dist/index.js -s https://example.com/sitemap.xml -c 5 -d
```

Available options:
- `--output-dir=DIR`, `-o=DIR`: Set output directory
- `--url-file=FILE`, `-f=FILE`: Set URL file source
- `--sitemap=URL`, `-s=URL`: Set sitemap URL source
- `--max-concurrent=NUM`, `-c=NUM`: Set maximum concurrent downloads
- `--use-titles`, `-t`: Use page titles for filenames
- `--use-url-paths`, `-u`: Use URL paths for filenames
- `--domain-folders`, `-d`: Organize by domain folders
- `--flat-structure`, `-n`: Use flat folder structure
- `--help`, `-h`: Show help message

## Configuration

The application uses a configuration file (`config.json`) to customize the conversion process. If the file doesn't exist, a default one will be created automatically.

### Configuration Options

```json
{
  "outputDir": "dist",
  "maxConcurrent": 3,
  "timeout": 30000,
  "retryAttempts": 3,
  "retryDelay": 3000,
  "selectors": {
    "exclude": [
      "footer",
      "header",
      "nav",
      "script",
      ".cookie-banner",
      "#sidebar"
    ],
    "unwrap": [
      ".container",
      ".wrapper"
    ],
    "removeAttributes": true
  },
  "turndownOptions": {
    "headingStyle": "atx",
    "hr": "---",
    "bulletListMarker": "-",
    "codeBlockStyle": "fenced",
    "emDelimiter": "*",
    "linkStyle": "referenced",
    "strongDelimiter": "**"
  },
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36",
  "fileOptions": {
    "addSourceUrl": true,
    "addDate": true
  }
}
```

### Configuration Fields

#### General Settings
- `outputDir`: Directory where Markdown files will be saved (default: `dist`)
- `maxConcurrent`: Maximum number of URLs to process concurrently (default: `3`)
- `timeout`: Timeout for HTTP requests in milliseconds (default: `30000`)
- `retryAttempts`: Number of retry attempts for failed conversions (default: `3`)
- `retryDelay`: Delay between retries in milliseconds (default: `3000`)

#### URL Source Options
- `urlSource.type`: Source type, either `file` for URL list file or `sitemap` for XML sitemap (default: `file`)
- `urlSource.file`: Path to the URL list file when using file source (default: `urls.txt`)
- `urlSource.sitemap`: URL to the XML sitemap when using sitemap source

#### Content Selection
- `selectors.exclude`: Array of CSS selectors for elements to remove from HTML before conversion (e.g., `footer`, `.ads`, `nav`)
- `selectors.unwrap`: Array of CSS selectors for container elements to unwrap (keeps their content but removes the container)
- `selectors.removeAttributes`: Whether to remove most HTML attributes (except essential ones like href, src)

#### Turndown Options
- `turndownOptions.headingStyle`: Heading style, either `atx` (# Heading) or `setext` (Heading\n=====)
- `turndownOptions.hr`: String to use for horizontal rules
- `turndownOptions.bulletListMarker`: String to use for bullet list items
- `turndownOptions.codeBlockStyle`: Code block style, either `fenced` (```) or `indented` (4 spaces)
- `turndownOptions.emDelimiter`: String to use for emphasis
- `turndownOptions.linkStyle`: Link style, either `inlined` ([text](url)) or `referenced` ([text][id])
- `turndownOptions.strongDelimiter`: String to use for strong emphasis

##### User Agent & File Options
- `userAgent`: User agent string to use when making HTTP requests
- `fileOptions.addSourceUrl`: Whether to add a comment with the source URL at the top of each file
- `fileOptions.addDate`: Whether to add a generation date at the top of each file
- `fileOptions.useDomainSubfolders`: Whether to organize files in subfolders by domain (e.g., `dist/example.com/path/file.md` vs `dist/path/file.md`)
- `fileOptions.usePageTitlesForFilenames`: Whether to use the page title for filenames instead of the URL path
- `fileOptions.preserveUrlFilenames`: Whether to ensure filenames are derived from URLs including query parameters (overrides usePageTitlesForFilenames)

## How It Works

1. The application gets URLs from either:
   - A text file with one URL per line
   - An XML sitemap (including sitemap index files with multiple sitemaps)
2. For each URL, it fetches the HTML content using axios.
3. The HTML content is preprocessed according to the configuration:
   - Elements matching the exclude selectors are removed
   - Elements matching the unwrap selectors have their containers removed but content kept
   - HTML attributes can be stripped for cleaner output
4. The processed HTML content is converted to Markdown using Turndown.
5. The resulting Markdown content is saved to a file in the output directory:
   - Filename can be based on page title or URL path
   - URLs with query parameters can be preserved in the filename
   - Files can be organized in domain-specific subfolders
6. Each file includes a reference to the source URL at the top if configured.

### File Organization Options

By default, the converter organizes files in a directory structure that mirrors the source URL's structure:

```
dist/
├── example.com/
│   ├── about/
│   │   └── team.md
│   ├── blog/
│   │   ├── post1.md
│   │   └── post2.md
│   └── index.md
└── another-site.com/
    └── index.md
```

#### Domain Subfolder Options

You can disable domain subfolders by setting `fileOptions.useDomainSubfolders` to `false` in your configuration. This will create a flatter structure:

```
dist/
├── about/
│   └── team.md
├── blog/
│   ├── post1.md
│   └── post2.md
└── index.md
```

Note that this might cause filename conflicts if you're converting pages from multiple domains that have the same path structure.

#### Filename Options

By default, filenames are derived from the URL path. When `fileOptions.usePageTitlesForFilenames` is set to `true`, the converter will use page titles instead:

```
dist/
├── example.com/
│   ├── about/
│   │   └── About Our Team - Example Company.md
│   ├── blog/
│   │   ├── First Blog Post - Example Blog.md
│   │   └── Second Blog Post - Example Blog.md
│   └── Example Company - Home Page.md
```

This makes files more descriptive and easier to identify but might create longer filenames.

## Examples

### Excluding Page Elements

To exclude headers, footers, navigation, and JavaScript from converted pages:

```json
{
  "selectors": {
    "exclude": [
      "header",
      "footer",
      "nav",
      "script",
      "style",
      ".cookie-banner",
      ".advertisement",
      "#sidebar"
    ]
  }
}
```

### Unwrapping Container Elements

To unwrap div containers but keep their content:

```json
{
  "selectors": {
    "unwrap": [
      ".container",
      ".wrapper",
      ".content-box",
      "article > div"
    ]
  }
}
```

### Configuring File Organization

To use a flat directory structure without domain subfolders:

```json
{
  "fileOptions": {
    "useDomainSubfolders": false
  }
}
```

### Using XML Sitemaps as URL Source

To use a sitemap XML file instead of a URL list file:

```json
{
  "urlSource": {
    "type": "sitemap",
    "sitemap": "https://example.com/sitemap.xml"
  }
}
```

For sitemap index files that reference multiple sitemaps:

```json
{
  "urlSource": {
    "type": "sitemap",
    "sitemap": "https://example.com/wp-sitemap.xml"
  }
}
```

#### Example Sitemaps

This tool works with both standard sitemaps and sitemap index files:

**Standard sitemap example:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2024-01-01</lastmod>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2024-01-02</lastmod>
  </url>
</urlset>
```

**Sitemap index example:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-pages.xml</loc>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-posts.xml</loc>
  </sitemap>
</sitemapindex>
```
```

### Using Page Titles for Filenames

To use page titles for filenames instead of URL paths:

```json
{
  "fileOptions": {
    "usePageTitlesForFilenames": true
  }
}
```

This will extract the page title from:
1. The `<title>` tag
2. The first `<h1>` tag (if no title tag is found)
3. The meta title tag

If no title is found, it falls back to using the URL path.

### Preserving URL-based Filenames

To ensure filenames are derived from URLs (including query parameters) for consistent and unique filenames:

```json
{
  "fileOptions": {
    "preserveUrlFilenames": true
  }
}
```

This option takes precedence over `usePageTitlesForFilenames` and creates filenames that:
1. Include the URL path components
2. Append a short hash of query parameters for URLs with query strings
3. Ensure unique filenames even for similar URLs with different parameters

Example: A URL like `example.com/products?id=123&category=books` would become `products-a7f31.md` (where "a7f31" is a hash of the query parameters)

## LLM Context Integration

This tool is specifically designed to help create high-quality content for Large Language Models. The converted Markdown files can be used to:

1. Build custom knowledge bases for LLM context windows
2. Create training data for fine-tuning models
3. Generate comprehensive documentation from websites
4. Archive web content in a clean, readable format
5. Prepare content for embedding in vector databases

When used for LLM context, consider:
- Using the exclude selectors to remove navigation, footers, and other non-essential content
- Keeping the addSourceUrl option enabled to maintain traceability
- Using page titles or URL paths for more descriptive filenames
- Adjusting Turndown options to ensure consistent formatting

## License

MIT licenses
