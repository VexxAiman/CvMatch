'use client'

import { useState, useRef, useEffect } from 'react'
import CVDisplay from './components/CVDisplay'

export default function CVMatch() {
  // Step 1 — inputs
  const [cv, setCv] = useState('')
  const [offer, setOffer] = useState('')
  const [pdfFileName, setPdfFileName] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const fileInputRef = useRef(null)

  // Step 2 — reformatted CV
  const [reformatted, setReformatted] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState('')

  // Step 3 — copy
  const [copied, setCopied] = useState(false)

  // Step 4 — chat
  const [messages, setMessages] = useState([])
  const [userInput, setUserInput] = useState('')
  const [sending, setSending] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Feature 1 — PDF upload: extract text and populate CV textarea
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

      setCv(data.text.trim())
    } catch (err) {
      setPdfError(err.message)
      setPdfFileName('')
    } finally {
      setPdfLoading(false)
      // reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Step 2 — call /api/analyze
  async function handleAnalyze() {
    if (!cv.trim() || !offer.trim()) return
    setAnalyzing(true)
    setAnalyzeError('')
    setReformatted('')
    setMessages([])

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv, offer }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      setReformatted(data.reformatted)
    } catch (err) {
      setAnalyzeError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  // Step 3 — copy to clipboard
  async function handleCopy() {
    await navigator.clipboard.writeText(reformatted)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Feature 2 — print dialog (browser handles PDF export)
  function handleDownloadPdf() {
    window.print()
  }

  // Step 4 — send chat message
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
      setMessages([...newMessages, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: `Erreur : ${err.message}` }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-indigo-700 tracking-tight">CVMatch</h1>
        <p className="mt-2 text-gray-500 text-lg">
          Coach carrière IA — optimisez votre CV pour chaque offre
        </p>
      </div>

      {/* Step 1 — Two text areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CV column */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <label className="font-semibold text-gray-700">
              Votre CV <span className="text-gray-400 font-normal">(texte brut)</span>
            </label>

            {/* Feature 1 — PDF upload button */}
            <div className="flex items-center gap-2">
              {pdfLoading && (
                <span className="text-xs text-gray-400">Extraction…</span>
              )}
              {pdfFileName && !pdfLoading && (
                <span className="text-xs text-indigo-600 truncate max-w-[120px]" title={pdfFileName}>
                  {pdfFileName}
                </span>
              )}
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-600 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importer PDF
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handlePdfUpload}
                  disabled={pdfLoading}
                />
              </label>
            </div>
          </div>

          {pdfError && (
            <p className="mb-2 text-xs text-red-500">{pdfError}</p>
          )}

          <textarea
            className="flex-1 border border-gray-300 rounded-xl p-4 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-h-[320px]"
            placeholder="Collez votre CV ici ou importez un PDF…"
            value={cv}
            onChange={(e) => setCv(e.target.value)}
          />
        </div>

        {/* Job offer column */}
        <div className="flex flex-col">
          <label className="mb-2 font-semibold text-gray-700">
            Offre d'emploi <span className="text-gray-400 font-normal">(texte brut)</span>
          </label>
          <textarea
            className="flex-1 border border-gray-300 rounded-xl p-4 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white min-h-[320px]"
            placeholder="Collez l'offre d'emploi ici…"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
          />
        </div>
      </div>

      {/* Analyser button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !cv.trim() || !offer.trim()}
          className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-xl text-base transition-colors shadow"
        >
          {analyzing ? 'Analyse en cours…' : 'Analyser'}
        </button>
      </div>

      {analyzeError && (
        <p className="mt-4 text-center text-red-600 text-sm">{analyzeError}</p>
      )}

      {/* Step 2 — Reformatted CV result */}
      {reformatted && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-800">CV reformaté</h2>

            <div className="flex items-center gap-2">
              {/* Feature 2 — Download as PDF */}
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Télécharger en PDF
              </button>

              {/* Step 3 — Copy button */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-lg text-sm font-medium transition-colors"
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
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copier le CV
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <CVDisplay text={reformatted} />
          </div>
        </div>
      )}

      {/* Step 4 — Chat interface */}
      {reformatted && (
        <div className="mt-10">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Discutez avec votre coach carrière
          </h2>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 min-h-[200px] max-h-[480px] overflow-y-auto flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-gray-400 text-sm text-center mt-8">
                Posez une question sur votre CV, vos points faibles, comment vous améliorer…
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-500 px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm">
                  En train de répondre…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSend} className="mt-3 flex gap-3">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Posez votre question…"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !userInput.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Envoyer
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
