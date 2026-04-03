'use client'

// ─── CV TEXT PARSER ──────────────────────────────────────────────────────────
// Strategy:
//   1. First non-empty line        → name
//   2. Lines until first blank     → subtitle / contact
//   3. ALL-CAPS or keyword lines   → section headers
//   4. Everything else             → content under current section

const SECTION_KEYWORDS = [
  'expérience', 'experience', 'formation', 'éducation', 'education',
  'compétences', 'competences', 'skills', 'langues', 'languages',
  'projets', 'projects', 'certifications', 'profil', 'résumé', 'summary',
  'objectif', 'loisirs', 'intérêts', 'interests', 'bénévolat', 'volunteering',
  'publications', 'réalisations', 'accomplishments', 'contact', 'références',
]

function isSectionHeader(line) {
  if (!line || line.length < 2) return false
  if (/^#{1,3}\s/.test(line)) return true
  if (line === line.toUpperCase() && /[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜÇ]/.test(line) && line.length <= 60) return true
  const lower = line.toLowerCase().replace(/^[#*\-_]+\s*/, '')
  return SECTION_KEYWORDS.some((kw) => lower.startsWith(kw))
}

function cleanHeader(line) {
  return line.replace(/^[#*\-_]+\s*/, '').replace(/[*_]+$/, '').trim()
}

function looksLikeContact(line) {
  return (
    /@/.test(line) ||
    /\+?\d[\d\s\-().]{6,}/.test(line) ||
    /linkedin|github|portfolio|http/i.test(line) ||
    /\|/.test(line) ||
    /^\s*[\w.]+\s*,\s*\w/.test(line)
  )
}

function stripName(text, name) {
  if (!name) return text
  // Remove the name (case-insensitive) and any surrounding separators
  return text
    .replace(new RegExp('(?:^|\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\s*[\\-—|,]\\s*)?', 'i'), '')
    .replace(/^[\s\-—|,]+|[\s\-—|,]+$/g, '')
    .trim()
}

function parseCV(text) {
  const lines = text.split('\n')
  const result = { name: '', subtitle: '', contact: [], sections: [] }
  let i = 0

  // Skip leading blank lines
  while (i < lines.length && !lines[i].trim()) i++

  // Fix 1: skip a leading section header (e.g. "NOM/CONTACT", "COORDONNÉES")
  // before reading the actual name — the AI sometimes emits the header first.
  if (i < lines.length && isSectionHeader(lines[i].trim()) && !looksLikeContact(lines[i].trim())) {
    i++
    while (i < lines.length && !lines[i].trim()) i++
  }

  // Name: first real non-empty, non-header line
  if (i < lines.length) {
    result.name = lines[i].trim().replace(/^[#*_]+\s*/, '').replace(/[*_]+$/, '')
    i++
  }

  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) { i++; break }
    if (isSectionHeader(line) && !looksLikeContact(line)) break
    if (looksLikeContact(line)) {
      result.contact.push(line)
    } else if (!result.subtitle) {
      result.subtitle = line.replace(/^[*_]+/, '').replace(/[*_]+$/, '').trim()
    } else {
      result.contact.push(line)
    }
    i++
  }

  // Fix 2: if the subtitle starts with or contains the name, strip it out.
  // Handles cases like "Jean Dupont — Développeur Full Stack".
  if (result.subtitle && result.name) {
    const subLower = result.subtitle.toLowerCase()
    const nameLower = result.name.toLowerCase()
    if (subLower.startsWith(nameLower) || subLower === nameLower) {
      result.subtitle = stripName(result.subtitle, result.name)
    }
  }

  // Fix 3: drop any contact item that is exactly the name (no other info).
  if (result.name) {
    result.contact = result.contact.filter(
      (item) => item.trim().toLowerCase() !== result.name.toLowerCase()
    )
  }

  let currentTitle = null
  let currentLines = []

  function flushSection() {
    if (currentTitle !== null || currentLines.length > 0) {
      result.sections.push({ title: currentTitle || '', content: currentLines.join('\n').trim() })
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

// ─── INLINE FORMATTER ────────────────────────────────────────────────────────

function inlineFormat(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;color:#0f1f3d">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:0.85em">$1</code>')
}

// ─── CONTENT RENDERER ────────────────────────────────────────────────────────

function renderContent(content) {
  const lines = content.split('\n')
  const elements = []
  let bulletBuffer = []

  function flushBullets() {
    if (!bulletBuffer.length) return
    elements.push(
      <ul key={`ul-${elements.length}`} style={{ margin: '6px 0 0', padding: 0, listStyle: 'none' }}>
        {bulletBuffer.map((b, j) => (
          <li key={j} style={{ display: 'flex', gap: '8px', marginBottom: '5px', lineHeight: '1.5' }}>
            <span style={{ color: '#2563eb', fontWeight: 700, marginTop: '1px', flexShrink: 0 }}>▸</span>
            <span style={{ color: '#374151', fontSize: '13px' }}
              dangerouslySetInnerHTML={{ __html: inlineFormat(b) }} />
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
      elements.push(<div key={`sp-${elements.length}`} style={{ height: '6px' }} />)
      continue
    }
    if (/^[-*•▪▸]\s+/.test(trimmed)) {
      bulletBuffer.push(trimmed.replace(/^[-*•▪▸]\s+/, ''))
    } else {
      flushBullets()
      // Bold standalone lines (e.g. job titles)
      const isBold = /\*\*/.test(trimmed) || (/^[A-ZÀ-Ü]/.test(trimmed) && trimmed.length < 80 && !trimmed.endsWith('.'))
      elements.push(
        <p key={`p-${elements.length}`}
          style={{
            margin: '0 0 4px',
            fontSize: '13px',
            lineHeight: '1.55',
            color: isBold ? '#0f1f3d' : '#374151',
            fontWeight: isBold ? 600 : 400,
          }}
          dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }} />
      )
    }
  }
  flushBullets()
  return elements
}

// ─── CONTACT ICONS ───────────────────────────────────────────────────────────

function contactType(line) {
  if (/@/.test(line)) return 'email'
  if (/\+?\d[\d\s\-().]{6,}/.test(line)) return 'phone'
  if (/linkedin|github|http/i.test(line)) return 'link'
  return 'location'
}

function ContactIcon({ type }) {
  const s = { width: 12, height: 12, flexShrink: 0 }
  const props = { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', style: s }
  if (type === 'email') return (
    <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  )
  if (type === 'phone') return (
    <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
  )
  if (type === 'link') return (
    <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
  )
  return (
    <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path
      strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function CVDisplay({ text }) {
  const cv = parseCV(text)

  const contactItems = cv.contact.flatMap((line) =>
    line.split('|').map((p) => p.trim()).filter(Boolean)
  )

  return (
    <div id="cv-print" style={{ fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif", background: '#fff' }}>

      {/* ── HEADER BAND ── */}
      <div style={{ background: '#0f1f3d', padding: '36px 40px 28px' }}>
        {/* Name */}
        <h1 style={{
          margin: 0, fontSize: '28px', fontWeight: 800, color: '#fff',
          letterSpacing: '-0.5px', lineHeight: 1.1,
        }}>
          {cv.name || 'Prénom Nom'}
        </h1>

        {/* Subtitle / Role */}
        {cv.subtitle && (
          <p style={{
            margin: '8px 0 0', fontSize: '14px', fontWeight: 500,
            color: '#93c5fd', letterSpacing: '0.2px',
          }}>
            {cv.subtitle}
          </p>
        )}

        {/* Contact row */}
        {contactItems.length > 0 && (
          <div style={{
            marginTop: '16px', display: 'flex', flexWrap: 'wrap',
            gap: '6px 20px', alignItems: 'center',
          }}>
            {contactItems.map((item, i) => (
              <span key={i} style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontSize: '12px', color: '#bfdbfe',
              }}>
                <ContactIcon type={contactType(item)} />
                {item}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── THIN ACCENT LINE ── */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #2563eb, #60a5fa, #0f1f3d)' }} />

      {/* ── BODY ── */}
      <div style={{ padding: '28px 40px 36px' }}>
        {cv.sections.map((section, i) => (
          <div key={i} style={{ marginBottom: i < cv.sections.length - 1 ? '22px' : 0 }}>
            {section.title && (
              <div style={{ marginBottom: '10px' }}>
                <h2 style={{
                  margin: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px',
                  textTransform: 'uppercase', color: '#2563eb',
                }}>
                  {section.title}
                </h2>
                <div style={{
                  marginTop: '5px', height: '1.5px',
                  background: 'linear-gradient(90deg, #2563eb 0%, #dbeafe 60%, transparent 100%)',
                  borderRadius: '2px',
                }} />
              </div>
            )}
            <div style={{ paddingLeft: '2px' }}>
              {renderContent(section.content)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
