---
name: scrapling
description: |
  Adaptive Python web scraping framework with stealth capabilities.
  
  Use when:
  - Scraping websites with anti-bot protection (Cloudflare, etc.)
  - Need adaptive parsing that handles site changes automatically
  - Building web crawlers with concurrency
  - Need fast parsing (774x faster than BeautifulSoup)
  
  Don't use when:
  - Simple static pages (use web_fetch instead)
  - API is available (use API directly)
  - Target has legal restrictions on scraping
  
  Output: Scraped content, parsed data, crawled datasets
---

# Scrapling

Python adaptive web scraping framework by D4Vinci (Karim Shoair). ~13.7k GitHub stars.

## Installation

**Requirements:** Python 3.10+

```bash
# Install core
pip install scrapling

# Install with browsers/fetchers (required for stealth mode)
pip install "scrapling[fetchers]"
scrapling install  # Install browsers

# Full installation
pip install "scrapling[all]"
```

## Credentials Required

**None required** - Scrapling is open source and free to use.

However, for stealth/bypass features:
- **Proxies**: Optional - for rotation when scraping gets blocked
- **Browser**: Bundled (Playwright/Chromium installed via `scrapling install`)

## Quick Start

### Simple Fetch & Parse
```python
from scrapling.fetchers import Fetcher

page = Fetcher.get('https://example.com')
content = page.css('h1::text').get()
```

### Stealth Fetch (bypasses Cloudflare)
```python
from scrapling.fetchers import StealthyFetcher

page = StealthyFetcher.fetch('https://nopecha.com/demo/cloudflare', 
                               headless=True, 
                               solve_cloudflare=True)
content = page.css('.content::text').get()
```

### Spider Crawl (full site)
```python
from scrapling.spiders import Spider, Response

class MySpider(Spider):
    name = "myspider"
    start_urls = ["https://example.com"]
    concurrent_requests = 10
    
    async def parse(self, response: Response):
        for item in response.css('.item'):
            yield {"title": item.css('.title::text').get()}
        
        # Follow pagination
        if next_page := response.css('.next a'):
            yield response.follow(next_page[0])

result = MySpider(crawldir="./data").start()
result.items.to_json("output.json")
```

## CLI Usage

```bash
# Interactive shell
scrapling shell

# Extract to file
scrapling extract get 'https://example.com' output.txt --css 'h1, p'

# Spider crawl
scrapling crawl 'https://example.com' --max-pages 10
```

## Key Features

| Feature | Description |
|---------|-------------|
| Adaptive Parsing | Auto-relocates elements when site structure changes |
| Stealth Mode | Bypasses Cloudflare, bot detection |
| Async Support | Concurrent requests for fast crawling |
| Spider Framework | Scrapy-like API with pause/resume |
| Proxy Rotation | Built-in proxy support |

## Common Use Cases

1. **Lead generation** - Scrape contact info from directories
2. **Price monitoring** - Track competitor pricing
3. **News aggregation** - Collect articles from multiple sources
4. **Job listings** - Gather openings from job boards

## Notes

- Stealth mode requires browsers (`scrapling install`)
- Some sites may block scraping - respect robots.txt and terms of service
- For heavy usage, consider proxy rotation to avoid IP blocks
