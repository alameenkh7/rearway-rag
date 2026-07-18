export interface ScrapeResult {
  text: string
  pagesScraped: number
}

export interface ScrapingService {
  scrapeWebsite(url: string, opts: { maxPages: number }): Promise<ScrapeResult>
}
