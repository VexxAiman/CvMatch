'use client'

function scoreColor(score) {
  if (score >= 75) return { bar: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' }
  if (score >= 50) return { bar: '#d97706', bg: '#fffbeb', border: '#fde68a', text: '#b45309' }
  return { bar: '#dc2626', bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' }
}

function scoreLabel(score) {
  if (score >= 75) return 'Excellent'
  if (score >= 50) return 'Moyen'
  return 'Faible'
}

export default function ScoreCard({ data, label, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
        style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#0f1f3d' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: '#0f1f3d' }}>{label}</h3>
            <p className="text-xs text-gray-400">Analyse en cours…</p>
          </div>
        </div>
        {/* Skeleton */}
        <div className="space-y-3 animate-pulse">
          <div className="h-3 bg-gray-100 rounded-full w-full" />
          <div className="flex gap-2 flex-wrap">
            {[1,2,3,4].map(i => <div key={i} className="h-6 w-20 bg-gray-100 rounded-full" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const colors = scoreColor(data.score)

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-6"
      style={{ borderColor: colors.border, fontFamily: "'Inter', sans-serif" }}>

      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#0f1f3d' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: '#0f1f3d' }}>{label}</h3>
            <p className="text-xs text-gray-400">Score de compatibilité ATS</p>
          </div>
        </div>

        {/* Big score badge */}
        <div className="flex flex-col items-end">
          <span className="text-4xl font-extrabold leading-none" style={{ color: colors.bar }}>
            {data.score}%
          </span>
          <span className="text-xs font-semibold mt-1 px-2 py-0.5 rounded-full"
            style={{ background: colors.bg, color: colors.text }}>
            {scoreLabel(data.score)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="w-full rounded-full overflow-hidden" style={{ height: '10px', background: '#f1f5f9' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${data.score}%`, background: colors.bar }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-300">0%</span>
          <span className="text-xs font-medium" style={{ color: colors.text }}>{data.score}% de correspondance</span>
          <span className="text-xs text-gray-300">100%</span>
        </div>
      </div>

      {/* Keywords grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Present */}
        {data.present?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-semibold text-green-700">Présents dans le CV</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.present.map((kw, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}>
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing */}
        {data.missing?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-xs font-semibold text-red-700">Manquants dans le CV</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.missing.map((kw, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
