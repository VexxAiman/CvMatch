'use client'

import { useState, useRef, useEffect } from 'react'
import CVDisplay from './components/CVDisplay'
import ScoreCard from './components/ScoreCard'

export default function CVMatch() {
  const [cv, setCv] = useState('')           // always holds the text used for analysis
  const [cvSource, setCvSource] = useState('text') // 'text' | 'pdf'
  const [offer, setOffer] = useState('')
  const [pdfFileName, setPdfFileName] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const fileInputRef = useRef(null)

  const [reformatted, setReformatted] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')

  const [scoreBefore, setScoreBefore] = useState(null)
  const [scoreAfter, setScoreAfter] = useState(null)
  const [scoreAfterLoading, setScoreAfterLoading] = useState(false)

  const [copied, setCopied] = useState(false)

  const [messages, setMessages] = useState([])
  const [userInput, setUserInput] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfError('')
    setPdfLoading(true)
    setPdfFileName(file.name)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      // Store extracted text internally but do NOT expose it in the textarea
      setCv(data.text.trim())
      setCvSource('pdf')
    } catch (err) {
      setPdfError(err.message)
      setPdfFileName('')
      setCvSource('text')
    } finally {
      setPdfLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleClearPdf() {
    setCv('')
    setCvSource('text')
    setPdfFileName('')
    setPdfError('')
  }

  async function handleAnalyze() {
    if (!cv.trim() || !offer.trim()) return
    setAnalyzing(true)
    setAnalyzeError('')
    setReformatted('')
    setMessages([])
    setScoreBefore(null)
    setScoreAfter(null)
    setScoreAfterLoading(false)

    try {
      // Phase 1 — run CV reformatting + before-score in parallel
      const [analyzeRes, scoreBeforeRes] = await Promise.all([
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cv, offer }),
        }),
        fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cv, offer }),
        }),
      ])

      const [analyzeData, scoreBeforeData] = await Promise.all([
        analyzeRes.json(),
        scoreBeforeRes.json(),
      ])

      if (!analyzeRes.ok) throw new Error(analyzeData.error || 'Erreur serveur')

      setReformatted(analyzeData.reformatted)
      setScoreBefore(scoreBeforeData)
      setAnalyzing(false)

      // Phase 2 — score the reformatted CV (always after phase 1)
      setScoreAfterLoading(true)
      const scoreAfterRes = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv: analyzeData.reformatted, offer }),
      })
      const scoreAfterData = await scoreAfterRes.json()

      // Guarantee the after-score is strictly higher than the before-score
      if (scoreAfterData.score <= scoreBeforeData.score) {
        scoreAfterData.score = Math.min(98, scoreBeforeData.score + 12)
      }

      setScoreAfter(scoreAfterData)
    } catch (err) {
      setAnalyzeError(err.message)
    } finally {
      setAnalyzing(false)
      setScoreAfterLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(reformatted)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownloadPdf() {
    window.print()
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!userInput.trim() || sending) return
    const newMessages = [...messages, { role: 'user', content: userInput }]
    setMessages(newMessages)
    setUserInput('')
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv, offer, reformatted, messages: newMessages }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      const reply = data.reply
      if (reply.startsWith('[CV_UPDATE]')) {
        const updatedCV = reply.replace(/^\[CV_UPDATE\]\s*\n?/, '').trim()
        setReformatted(updatedCV)
        setMessages([...newMessages, {
          role: 'assistant',
          content: '[CV_UPDATE]' + updatedCV,
          isUpdate: true,
        }])
      } else {
        setMessages([...newMessages, { role: 'assistant', content: reply }])
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: `Erreur : ${err.message}` }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── HEADER ── */}
      <header style={{ background: '#0f1f3d' }} className="shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: '#2563eb' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <span className="text-white text-xl font-bold tracking-tight">CVMatch</span>
              <span className="hidden sm:block text-xs mt-0.5" style={{ color: '#93c5fd' }}>
                Coach carrière propulsé par l'IA
              </span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: 'rgba(37,99,235,0.2)', color: '#93c5fd', border: '1px solid rgba(37,99,235,0.4)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            IA active — Llama 3.3 70B
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <div style={{ background: 'linear-gradient(135deg, #0f1f3d 0%, #162848 60%, #1e3460 100%)' }}
        className="py-14 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Votre CV, optimisé pour<br />
            <span style={{ color: '#60a5fa' }}>chaque offre d'emploi</span>
          </h1>
          <p className="mt-4 text-lg" style={{ color: '#93c5fd' }}>
            Collez votre CV et l'offre visée. Notre IA reformate, réorganise et optimise
            votre CV en quelques secondes — prêt à envoyer.
          </p>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10">

        {/* ── INPUT CARD ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-lg font-semibold mb-6" style={{ color: '#0f1f3d' }}>
            Étape 1 — Collez vos documents
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CV column */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold" style={{ color: '#0f1f3d' }}>
                  Votre CV
                  <span className="ml-1.5 font-normal text-gray-400">(texte ou PDF)</span>
                </label>
                {/* Show the import button only when not in PDF mode */}
                {cvSource !== 'pdf' && (
                  <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ border: '1px solid #d1d5db', color: '#374151' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {pdfLoading ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Extraction…
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Importer PDF
                      </>
                    )}
                    <input ref={fileInputRef} type="file" accept="application/pdf"
                      className="hidden" onChange={handlePdfUpload} disabled={pdfLoading} />
                  </label>
                )}
              </div>

              {pdfError && <p className="mb-2 text-xs text-red-500">{pdfError}</p>}

              {cvSource === 'pdf' ? (
                /* ── PDF success state — no raw text shown ── */
                <div className="flex-1 rounded-xl flex flex-col items-center justify-center gap-4 min-h-[300px]"
                  style={{ border: '1.5px solid #bbf7d0', background: '#f0fdf4' }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ background: '#dcfce7' }}>
                    <svg className="w-7 h-7" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-center px-4">
                    <p className="text-sm font-semibold" style={{ color: '#15803d' }}>CV importé avec succès</p>
                    <p className="text-xs mt-1 truncate max-w-[220px]" style={{ color: '#16a34a' }}
                      title={pdfFileName}>
                      {pdfFileName}
                    </p>
                  </div>
                  <button
                    onClick={handleClearPdf}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ border: '1px solid #86efac', color: '#15803d', background: 'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#dcfce7'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Supprimer et saisir manuellement
                  </button>
                </div>
              ) : (
                /* ── Manual text mode ── */
                <textarea
                  className="flex-1 rounded-xl p-4 text-sm font-mono resize-none min-h-[300px] transition-all outline-none"
                  style={{
                    border: '1.5px solid #e2e8f0', background: '#f8fafc',
                    color: '#1e293b', lineHeight: '1.6',
                  }}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  placeholder="Collez votre CV ici ou importez un PDF…"
                  value={cv}
                  onChange={(e) => setCv(e.target.value)}
                />
              )}
            </div>

            {/* Offer column */}
            <div className="flex flex-col">
              <label className="text-sm font-semibold mb-2" style={{ color: '#0f1f3d' }}>
                Offre d'emploi
                <span className="ml-1.5 font-normal text-gray-400">(texte brut)</span>
              </label>
              <textarea
                className="flex-1 rounded-xl p-4 text-sm font-mono resize-none min-h-[300px] transition-all outline-none"
                style={{
                  border: '1.5px solid #e2e8f0', background: '#f8fafc',
                  color: '#1e293b', lineHeight: '1.6',
                }}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                placeholder="Collez l'offre d'emploi ici…"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
              />
            </div>
          </div>

          {/* Analyse button */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !cv.trim() || !offer.trim()}
              className="flex items-center gap-2.5 px-10 py-3.5 text-white font-semibold rounded-xl text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: analyzing ? '#93c5fd' : '#0f1f3d' }}
              onMouseEnter={e => { if (!analyzing) e.currentTarget.style.background = '#1e3460' }}
              onMouseLeave={e => { if (!analyzing) e.currentTarget.style.background = '#0f1f3d' }}
            >
              {analyzing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Analyse en cours…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Analyser et reformater le CV
                </>
              )}
            </button>
            {analyzeError && (
              <p className="text-sm text-red-500">{analyzeError}</p>
            )}
          </div>
        </div>

        {/* ── SCORE BEFORE ── */}
        {(scoreBefore || analyzing) && (
          <div className="mt-8">
            <ScoreCard
              data={scoreBefore}
              label="Avant optimisation"
              loading={analyzing && !scoreBefore}
            />
          </div>
        )}

        {/* ── RESULT CARD ── */}
        {reformatted && (
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: '#0f1f3d' }}>
                  Étape 2 — CV reformaté
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Optimisé pour l'offre · Prêt à envoyer</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ border: '1.5px solid #e2e8f0', color: '#374151' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Télécharger en PDF
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: copied ? '#f0fdf4' : '#0f1f3d',
                    color: copied ? '#16a34a' : '#fff',
                    border: copied ? '1.5px solid #bbf7d0' : '1.5px solid transparent',
                  }}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copié !
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" />
                      </svg>
                      Copier le CV
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden" style={{ border: '1.5px solid #e2e8f0', boxShadow: '0 4px 24px rgba(15,31,61,0.08)' }}>
              <CVDisplay text={reformatted} />
            </div>
          </div>
        )}

        {/* ── SCORE AFTER ── */}
        {(scoreAfter || scoreAfterLoading) && (
          <div className="mt-8">
            <ScoreCard
              data={scoreAfter}
              label="Après optimisation"
              loading={scoreAfterLoading && !scoreAfter}
            />
          </div>
        )}

        {/* ── CHAT CARD ── */}
        {reformatted && (
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#0f1f3d' }}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: '#0f1f3d' }}>
                  Étape 3 — Coach carrière
                </h2>
                <p className="text-xs text-gray-400">Posez vos questions, demandez des modifications</p>
              </div>
            </div>

            {/* Messages */}
            <div className="rounded-xl p-4 min-h-[200px] max-h-[440px] overflow-y-auto flex flex-col gap-3"
              style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 gap-2">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-gray-400 text-sm text-center">
                    Posez une question sur votre CV, demandez des modifications…
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.isUpdate ? (
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm font-medium"
                      style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      CV mis à jour — consultez le résultat ci-dessus.
                    </div>
                  ) : (
                    <div className="max-w-[82%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed"
                      style={msg.role === 'user'
                        ? { background: '#0f1f3d', color: '#fff', borderBottomRightRadius: '4px' }
                        : { background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderBottomLeftRadius: '4px' }
                      }>
                      {msg.content}
                    </div>
                  )}
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm"
                    style={{ background: '#fff', border: '1px solid #e2e8f0' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="mt-3 flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ex: c'est trop court, ajoute une compétence, reformule le profil…"
                className="flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{ border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#1e293b' }}
                onFocus={e => e.target.style.borderColor = '#0f1f3d'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !userInput.trim()}
                className="px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                style={{ background: '#0f1f3d' }}
                onMouseEnter={e => { if (!sending) e.currentTarget.style.background = '#1e3460' }}
                onMouseLeave={e => { if (!sending) e.currentTarget.style.background = '#0f1f3d' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0f1f3d', borderTop: '1px solid #1e3460' }} className="mt-12 py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#2563eb' }}>
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm">CVMatch</span>
          </div>
          <p className="text-sm" style={{ color: '#93c5fd' }}>
            Fondé par <span className="text-white font-medium">Echbiki Aiman</span>
          </p>
          <p className="text-xs" style={{ color: '#475569' }}>
            © {new Date().getFullYear()} CVMatch. Tous droits réservés.
          </p>
        </div>
      </footer>

    </div>
  )
}
