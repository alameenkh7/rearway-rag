import { Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import * as cheerio from 'cheerio'
import {
  ScrapeResult,
  ScrapingService,
} from '../../core/entitygateway/ScrapingService'
import { MAX_CONTENT_CHARS } from '../../core/constants'

const REQUEST_TIMEOUT = 12_000
const USER_AGENT =
  'Mozilla/5.0 (compatible; ResolveBot/1.0; +https://resolveapi.rearway.com)'

// Ported from the legacy rag/scrape.js crawler — same same-origin BFS crawl
// seeded from the homepage, same noise-stripping selectors, same SPA
// meta-description fallback. `maxPages` is now a parameter (TRIAL_MAX_SCRAPE_PAGES
// today) instead of a hardcoded constant, so Instant/Business can pass a
// different cap later without touching this service.
@Injectable()
export class ScrapingServiceImpl implements ScrapingService {
  private readonly logger = new Logger('ScrapingService')

  private extractText($: cheerio.CheerioAPI): string {
    $(
      'script, style, nav, footer, header, iframe, img, svg, form, button'
    ).remove()
    $('[aria-hidden="true"]').remove()

    const contentEl = $(
      'main, article, [role="main"], .content, #content, .main, #main'
    ).first()
    const target = contentEl.length ? contentEl : $('body')
    return target.text().replace(/\s+/g, ' ').trim()
  }

  private collectInternalLinks(
    $: cheerio.CheerioAPI,
    baseUrl: string
  ): string[] {
    const base = new URL(baseUrl)
    const links = new Set<string>()

    $('a[href]').each((_, el) => {
      try {
        const href = $(el).attr('href')
        if (!href) return
        const resolved = new URL(href, baseUrl)

        if (
          resolved.origin === base.origin &&
          !resolved.pathname.match(
            /\.(pdf|jpg|jpeg|png|gif|svg|css|js|zip|xml)$/i
          ) &&
          resolved.pathname !== base.pathname
        ) {
          resolved.hash = ''
          links.add(resolved.toString().replace(/\/$/, ''))
        }
      } catch {
        // Ignore malformed hrefs.
      }
    })

    return [...links]
  }

  async scrapeWebsite(
    url: string,
    opts: { maxPages: number }
  ): Promise<ScrapeResult> {
    const startUrl = new URL(url).toString()

    const visited = new Set<string>()
    const queue = [startUrl]
    const textParts: string[] = []
    const scrapedUrls: string[] = []
    let totalChars = 0

    while (
      queue.length > 0 &&
      visited.size < opts.maxPages &&
      totalChars < MAX_CONTENT_CHARS
    ) {
      const current = queue.shift() as string
      if (visited.has(current)) continue
      visited.add(current)

      try {
        this.logger.log(`Fetching: ${current}`)

        const response = await axios.get<string>(current, {
          timeout: REQUEST_TIMEOUT,
          headers: { 'User-Agent': USER_AGENT },
          maxRedirects: 5,
          validateStatus: status => status < 400,
        })

        const contentType = String(response.headers['content-type'] ?? '')
        if (!contentType.includes('text/html')) continue

        const $ = cheerio.load(response.data)
        let text = this.extractText($)

        if (text.length < 50) {
          const title = $('title').text().trim()
          const metaDesc =
            $('meta[name="description"]').attr('content') ||
            $('meta[property="og:description"]').attr('content') ||
            ''
          const fallback = `${title}\n${metaDesc}`.trim()
          if (fallback.length > 10) text = fallback
        }

        if (text.length > 50) {
          textParts.push(`--- ${current} ---\n${text}`)
          scrapedUrls.push(current)
          totalChars += text.length
        }

        if (visited.size === 1) {
          for (const link of this.collectInternalLinks($, current)) {
            if (!visited.has(link)) queue.push(link)
          }
        }
      } catch (err) {
        this.logger.warn(
          `Failed to fetch ${current}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    if (textParts.length === 0) {
      throw new Error(`Could not extract any text from ${url}`)
    }

    return { text: textParts.join('\n\n'), pagesScraped: scrapedUrls.length }
  }
}
