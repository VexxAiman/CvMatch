import Groq from 'groq-sdk'

export async function POST(request) {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  try {
    const { cv, offer } = await request.json()

    if (!cv?.trim() || !offer?.trim()) {
      return Response.json({ error: 'CV et offre requis.' }, { status: 400 })
    }

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 512,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            "Tu es un expert ATS (Applicant Tracking System) chargé d'évaluer la correspondance entre un CV et une offre d'emploi. " +
            "Identifie les 8 à 12 mots-clés ou compétences les plus importants de l'offre d'emploi. " +
            "Pour chaque mot-clé, détermine s'il est présent ou absent dans le CV. " +
            "Calcule un score de correspondance de 0 à 100 basé sur le ratio de mots-clés présents, pondéré par leur importance. " +
            "Réponds UNIQUEMENT avec un objet JSON valide respectant exactement ce format, sans markdown ni explication : " +
            "{\"score\": <entier 0-100>, \"present\": [<mots-clés trouvés dans le CV>], \"missing\": [<mots-clés absents du CV>]}",
        },
        {
          role: 'user',
          content: `CV :\n${cv}\n\n---\nOffre d'emploi :\n${offer}`,
        },
      ],
    })

    const raw = completion.choices[0].message.content
    const parsed = JSON.parse(raw)

    // Sanitise: ensure types are correct
    return Response.json({
      score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
      present: Array.isArray(parsed.present) ? parsed.present.slice(0, 15) : [],
      missing: Array.isArray(parsed.missing) ? parsed.missing.slice(0, 15) : [],
    })
  } catch (err) {
    console.error('score error:', err)
    return Response.json({ error: err.message || 'Erreur interne.' }, { status: 500 })
  }
}
