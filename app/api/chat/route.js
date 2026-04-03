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
      "RÈGLE IMPORTANTE — modification du CV :\n" +
      "Si l'utilisateur te demande de modifier, corriger, allonger, raccourcir, reformuler, " +
      "améliorer ou refaire le CV (exemples : \"c'est trop court\", \"ajoute\", \"modifie\", " +
      "\"reformule\", \"change\", \"améliore\", \"refais\", \"mets à jour\", \"trop long\"), tu dois :\n" +
      "1. Produire le CV complet et reformaté (pas un extrait, le CV entier)\n" +
      "2. Faire précéder ta réponse EXACTEMENT par la balise [CV_UPDATE] seule sur la première ligne, " +
      "puis une ligne vide, puis le CV complet\n" +
      "3. Ne rien écrire d'autre — ni introduction, ni commentaire, ni explication\n\n" +
      "Pour toutes les autres questions (conseils, analyse, points forts/faibles, explications), " +
      "réponds normalement en prose sans utiliser [CV_UPDATE].\n\n" +
      `CV original de l'utilisateur :\n${cv}\n\n` +
      `---\nOffre d'emploi ciblée :\n${offer}\n\n` +
      `---\nCV reformaté actuel :\n${reformatted}`

    // Strip previous CV update content from history to keep messages lean
    const cleanedMessages = messages.map((m) => {
      if (m.role === 'assistant' && m.content?.startsWith('[CV_UPDATE]')) {
        return { role: 'assistant', content: 'J\'ai mis à jour votre CV.' }
      }
      return { role: m.role, content: m.content }
    })

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        ...cleanedMessages,
      ],
    })

    return Response.json({ reply: completion.choices[0].message.content })
  } catch (err) {
    console.error('chat error:', err)
    return Response.json({ error: err.message || 'Erreur interne.' }, { status: 500 })
  }
}
