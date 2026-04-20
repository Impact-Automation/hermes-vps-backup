#!/usr/bin/env python3
"""
Scrapling Example - Simple web scraper
Usage: python3 scrape.py <url> [css-selector]
"""

import sys
import json

def main():
    try:
        from scrapling.fetchers import Fetcher
    except ImportError:
        print("Error: scrapling not installed.")
        print("Install with: pip install scrapling")
        sys.exit(1)
    
    if len(sys.argv) < 2:
        print("Usage: python3 scrape.py <url> [css-selector]")
        print("Example: python3 scrape.py 'https://example.com' 'h1, p'")
        sys.exit(1)
    
    url = sys.argv[1]
    selector = sys.argv[2] if len(sys.argv) > 2 else 'body'
    
    print(f"Fetching: {url}")
    page = Fetcher.get(url)
    
    # Extract content
    elements = page.css(selector).getall()
    
    print(f"\nFound {len(elements)} elements matching '{selector}':\n")
    for i, elem in enumerate(elements[:10], 1):
        text = elem.strip()[:100]
        print(f"{i}. {text}")
    
    if len(elements) > 10:
        print(f"\n... and {len(elements) - 10} more")

if __name__ == "__main__":
    main()
