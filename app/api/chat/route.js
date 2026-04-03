import Groq from 'groq-sdk'

export async function POST(request) {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  try {
    const { cv, offer, reformatted, messages } = await request.json()

    if (!messages?.length) {
      return Response.json({ error: 'Messages requis.' }, { status: 400 })
    }

    const systemPrompt =
      "Tu es un expert RH direct et franc. Tu as déjà reformaté le CV de l'utilisateur " +
      "pour une offre spécifique. Réponds à ses questions sur son CV, ses points faibles, " +
      "comment s'améliorer. Sois précis, honnête, sans flatterie inutile. Français uniquement.\n\n" +
      `CV original :\n${cv}\n\n---\nOffre d'emploi :\n${offer}\n\n---\nCV reformaté :\n${reformatted}`

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    })

    return Response.json({ reply: completion.choices[0].message.content })
  } catch (err) {
    console.error('chat error:', err)
    return Response.json({ error: err.message || 'Erreur interne.' }, { status: 500 })
  }
}
