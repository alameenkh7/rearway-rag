const axios = require('axios')
const cheerio = require('cheerio')
const { URL } = require('url')

const MAX_PAGES = 10          // max pages to crawl per website
const REQUEST_TIMEOUT = 12000 // 12 seconds per page
const MAX_CONTENT_CHARS = 200000 // ~200K chars before chunking

// User-agent that most sites won't block
const USER_AGENT =
  'Mozilla/5.0 (compatible; ResolveBot/1.0; +https://resolve.rearway.com)'

// Extract clean readable text from an HTML string using cheerio
function extractText($) {
  // Remove noise elements
  $('script, style, nav, footer, header, iframe, img, svg, form, button').remove()
  $('[aria-hidden="true"]').remove()

  // Prefer main content areas, fall back to full body
  const contentEl =
    $('main, article, [role="main"], .content, #content, .main, #main').first()

  const target = contentEl.length ? contentEl : $('body')
  return target
    .text()
    .replace(/\s+/g, ' ')
    .trim()
}

// Collect internal links from a parsed page, normalised to the same origin
function collectInternalLinks($, baseUrl) {
  const base = new URL(baseUrl)
  const links = new Set()

  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href')
      const resolved = new URL(href, baseUrl)

      // Same origin only; skip anchors, query-heavy URLs, and common asset paths
      if (
        resolved.origin === base.origin &&
        !resolved.pathname.match(/\.(pdf|jpg|jpeg|png|gif|svg|css|js|zip|xml)$/i) &&
        resolved.pathname !== base.pathname
      ) {
        // Normalise: strip fragment and trailing slash
        resolved.hash = ''
        const normalised = resolved.toString().replace(/\/$/, '')
        links.add(normalised)
      }
    } catch (_err) {
      // Ignore malformed hrefs
    }
  })

  return [...links]
}

// Fetch a single URL and return its text content
async function fetchPage(url) {
  const response = await axios.get(url, {
    timeout: REQUEST_TIMEOUT,
    headers: { 'User-Agent': USER_AGENT },
    maxRedirects: 5,
    // Accept HTML only
    validateStatus: status => status < 400,
  })

  const contentType = response.headers['content-type'] || ''
  if (!contentType.includes('text/html')) return ''

  const $ = cheerio.load(response.data)
  return extractText($)
}

// Main export — scrapes a website and returns combined text
// Input:  url (string) — the website homepage URL
// Output: { text: string, pagesScraped: number, urls: string[] }
async function scrapeWebsite(url) {
  // Normalise the URL
  const startUrl = new URL(url).toString()

  const visited = new Set()
  const queue = [startUrl]
  const textParts = []
  const scrapedUrls = []
  let totalChars = 0

  while (queue.length > 0 && visited.size < MAX_PAGES && totalChars < MAX_CONTENT_CHARS) {
    const current = queue.shift()

    if (visited.has(current)) continue
    visited.add(current)

    try {
      console.log(`[scrape] Fetching: ${current}`)

      const response = await axios.get(current, {
        timeout: REQUEST_TIMEOUT,
        headers: { 'User-Agent': USER_AGENT },
        maxRedirects: 5,
        validateStatus: status => status < 400,
      })

      const contentType = response.headers['content-type'] || ''
      if (!contentType.includes('text/html')) continue

      const $ = cheerio.load(response.data)
      const text = extractText($)

      if (text.length > 100) {
        textParts.push(`--- ${current} ---\n${text}`)
        scrapedUrls.push(current)
        totalChars += text.length
      }

      // Only crawl links from the first page (homepage)
      // to avoid going too deep into the site
      if (visited.size === 1) {
        const links = collectInternalLinks($, current)
        for (const link of links) {
          if (!visited.has(link)) {
            queue.push(link)
          }
        }
      }
    } catch (err) {
      console.warn(`[scrape] Failed to fetch ${current}: ${err.message}`)
    }
  }

  if (textParts.length === 0) {
    throw new Error(`Could not extract any text from ${url}`)
  }

  return {
    text: textParts.join('\n\n'),
    pagesScraped: scrapedUrls.length,
    urls: scrapedUrls,
  }
}

module.exports = { scrapeWebsite }
