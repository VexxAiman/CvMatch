'use client'

// ---------------------------------------------------------------------------
// CV text parser
// Handles plain-text CVs produced by the LLM.
// Strategy:
//   1. First non-empty line  → name
//   2. Lines until first blank → subtitle + contact
//   3. ALL-CAPS lines (or known French section keywords) → section headers
//   4. Everything else        → content under the current section
// ---------------------------------------------------------------------------

const SECTION_KEYWORDS = [
  'expérience', 'experience', 'formation', 'éducation', 'education',
  'compétences', 'competences', 'skills', 'langues', 'languages',
  'projets', 'projects', 'certifications', 'profil', 'résumé', 'summary',
  'objectif', 'loisirs', 'intérêts', 'interests', 'bénévolat', 'volunteering',
  'publications', 'réalisations', 'accomplishments', 'contact', 'références',
]

function isSectionHeader(line) {
  if (!line || line.length < 2) return false
  // Markdown-style heading
  if (/^#{1,3}\s/.test(line)) return true
  // All uppercase with at least one letter
  if (line === line.toUpperCase() && /[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ]/.test(line) && line.length <= 60) return true
  // Starts with a known keyword (case-insensitive)
  const lower = line.toLowerCase().replace(/^[#*\-_]+\s*/, '')
  return SECTION_KEYWORDS.some((kw) => lower.startsWith(kw))
}

function cleanHeader(line) {
  return line.replace(/^[#*\-_]+\s*/, '').replace(/[*_]+$/, '').trim()
}

// Contact line heuristic: contains @ or phone digits or common separators
function looksLikeContact(line) {
  return (
    /@/.test(line) ||
    /\+?\d[\d\s\-().]{6,}/.test(line) ||
    /linkedin|github|portfolio|http/i.test(line) ||
    /\|/.test(line) ||
    /^\s*[\w.]+\s*,\s*\w+/.test(line) // "City, Country"
  )
}

function parseCV(text) {
  const lines = text.split('\n')
  const result = { name: '', subtitle: '', contact: [], sections: [] }

  let i = 0

  // Skip leading blank lines
  while (i < lines.length && !lines[i].trim()) i++

  // Name: first non-empty line (strip markdown)
  if (i < lines.length) {
    result.name = lines[i].trim().replace(/^[#*_]+\s*/, '').replace(/[*_]+$/, '')
    i++
  }

  // Header block: lines until first blank line
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) { i++; break }
    if (isSectionHeader(line) && !looksLikeContact(line)) break // section started early

    if (looksLikeContact(line)) {
      result.contact.push(line)
    } else if (!result.subtitle) {
      result.subtitle = line.replace(/^[*_]+/, '').replace(/[*_]+$/, '').trim()
    } else {
      result.contact.push(line)
    }
    i++
  }

  // Body: sections
  let currentTitle = null
  let currentLines = []

  function flushSection() {
    if (currentTitle !== null || currentLines.length > 0) {
      result.sections.push({
        title: currentTitle || '',
        content: currentLines.join('\n').trim(),
      })
    }
    currentTitle = null
    currentLines = []
  }

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trim()

    if (isSectionHeader(line)) {
      flushSection()
      currentTitle = cleanHeader(line)
    } else {
      currentLines.push(raw)
    }
    i++
  }
  flushSection()

  return result
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ContactIcon({ type }) {
  if (type === 'email') return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
  if (type === 'phone') return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
  if (type === 'link') return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  )
  return (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function contactType(line) {
  if (/@/.test(line)) return 'email'
  if (/\+?\d[\d\s\-().]{6,}/.test(line)) return 'phone'
  if (/linkedin|github|http/i.test(line)) return 'link'
  return 'location'
}

// Render content: detect bullet lists, bold (**text**), em (—)
function renderContent(content) {
  const lines = content.split('\n')
  const elements = []
  let bulletBuffer = []

  function flushBullets() {
    if (bulletBuffer.length === 0) return
    elements.push(
      <ul key={`ul-${elements.length}`} className="list-none space-y-1 mt-1">
        {bulletBuffer.map((b, j) => (
          <li key={j} className="flex gap-2 text-sm text-gray-700 leading-snug">
            <span className="text-indigo-400 mt-0.5 shrink-0">▸</span>
            <span dangerouslySetInnerHTML={{ __html: inlineFormat(b) }} />
          </li>
        ))}
      </ul>
    )
    bulletBuffer = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushBullets()
      elements.push(<div key={`sp-${elements.length}`} className="h-2" />)
      continue
    }
    // Bullet: starts with -, *, •, ▪, ▸
    if (/^[-*•▪▸]\s+/.test(trimmed)) {
      bulletBuffer.push(trimmed.replace(/^[-*•▪▸]\s+/, ''))
    } else {
      flushBullets()
      elements.push(
        <p key={`p-${elements.length}`} className="text-sm text-gray-700 leading-snug"
          dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }} />
      )
    }
  }
  flushBullets()
  return elements
}

// Convert **bold**, *italic*, and em-dash patterns
function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-xs">$1</code>')
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CVDisplay({ text }) {
  const cv = parseCV(text)

  // Split contact items that use | as separator
  const contactItems = cv.contact.flatMap((line) =>
    line.split('|').map((p) => p.trim()).filter(Boolean)
  )

  return (
    <div
      id="cv-print"
      className="bg-white font-sans"
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      {/* ── Header ── */}
      <div className="bg-indigo-700 text-white px-10 py-8">
        <h1 className="text-4xl font-bold tracking-tight leading-none">
          {cv.name || 'Nom Prénom'}
        </h1>
        {cv.subtitle && (
          <p className="mt-2 text-indigo-200 text-lg font-medium">{cv.subtitle}</p>
        )}
        {contactItems.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5">
            {contactItems.map((item, i) => (
              <span key={i} className="flex items-center gap-1.5 text-indigo-100 text-xs">
                <ContactIcon type={contactType(item)} />
                {item}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="px-10 py-8 space-y-6">
        {cv.sections.map((section, i) => (
          <div key={i}>
            {section.title && (
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 whitespace-nowrap">
                  {section.title}
                </h2>
                <div className="flex-1 h-px bg-indigo-100" />
              </div>
            )}
            <div className="space-y-1">
              {renderContent(section.content)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
