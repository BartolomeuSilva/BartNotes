async function fetchWithCorsProxy(url) {
  console.log('Starting fetch for:', url)

  // Try Jina.ai first - best for content extraction
  try {
    console.log('Trying Jina.ai...')
    const response = await fetch('https://r.jina.ai/' + url, { 
      mode: 'cors',
      signal: AbortSignal.timeout(10000)
    })
    console.log('Jina response status:', response.status)
    if (response.ok) {
      const text = await response.text()
      console.log('Jina response length:', text.length)
      if (text && text.length > 100) {
        return text
      }
    }
  } catch (e) {
    console.log('Jina failed:', e.message)
  }

  // Try AllOrigins
  try {
    console.log('Trying AllOrigins...')
    const response = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(url), {
      signal: AbortSignal.timeout(10000)
    })
    if (response.ok) {
      const data = await response.json()
      if (data.contents && data.contents.length > 100) {
        return data.contents
      }
    }
  } catch (e) {
    console.log('AllOrigins failed:', e.message)
  }
  
  throw new Error('Não foi possível acessar o URL. Verifique se a URL está correta.')
}

function extractTitle(html) {
  const jinaTitle = html.match(/^Title:\s*(.+)$/m)
  if (jinaTitle) return jinaTitle[1].trim()

  const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/i)
  if (ogTitle) return ogTitle[1].trim()

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) return titleMatch[1].trim()

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match) return h1Match[1].trim()

  return ''
}

function extractContent(html) {
  // Jina.ai Markdown format
  const markdownMatch = html.match(/^Markdown Content:\n([\s\S]+)$/m)
  if (markdownMatch) {
    return markdownMatch[1].trim()
  }

  // Plain text
  if (!html.includes('<')) {
    return html.trim()
  }

  // Clean HTML
  let clean = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  clean = clean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  clean = clean.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
  clean = clean.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
  clean = clean.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')

  const mainMatch = clean.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
  if (mainMatch) return cleanText(mainMatch[1])

  const articleMatch = clean.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  if (articleMatch) return cleanText(articleMatch[1])

  const bodyMatch = clean.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) return cleanText(bodyMatch[1])

  const text = cleanText(clean)
  return text.length < 50 ? null : text
}

function cleanText(html) {
  let text = html.replace(/<\/(p|div|h[1-6]|li|br)>/gi, '\n')
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<[^>]+>/g, '')
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n\s*\n/g, '\n\n')
  return text.trim()
}

export async function clipUrl(url) {
  console.log('clipUrl called with:', url)
  const html = await fetchWithCorsProxy(url)

  if (!html) {
    throw new Error('Não foi possível obter o conteúdo')
  }

  const title = extractTitle(html)
  const content = extractContent(html)

  console.log('Extracted - Title:', title, 'Content length:', content?.length)

  if (!title && !content) {
    throw new Error('Não foi possível extrair conteúdo')
  }

  let markdown = ''

  if (title) {
    markdown += `# ${title}\n\n`
  }

  markdown += `> Fonte: ${url}\n\n`

  if (content) {
    const maxLength = 10000
    let truncatedContent = content.length > maxLength
      ? content.slice(0, maxLength) + '\n\n...[conteúdo truncado]'
      : content
    markdown += truncatedContent
  } else {
    markdown += '(Conteúdo não disponível)'
  }

  return {
    title: title || 'Nota capturada',
    content: markdown,
    url,
  }
}
