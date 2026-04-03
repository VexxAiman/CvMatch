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
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content:
            "Tu es un expert RH senior avec 15 ans d'expérience en recrutement en France.\n" +
            "Quand tu reformates un CV, tu dois:\n" +
            "1. Identifier les 5-10 mots-clés les plus importants de l'offre d'emploi et les intégrer naturellement dans le CV\n" +
            "2. Reformuler les expériences avec des verbes d'action forts (développé, optimisé, piloté, réduit, augmenté) et des chiffres quantifiés si possible\n" +
            "3. Réorganiser les sections dans cet ordre: Profil, Expériences, Formation, Compétences, Langues\n" +
            "4. Le profil doit être une accroche de 3 lignes maximum qui répond exactement au poste visé\n" +
            "5. Supprimer tout ce qui n'est pas pertinent pour l'offre\n" +
            "6. Garder le CV sur une page maximum\n" +
            "7. Utiliser le même format que le CV original mais optimisé\n" +
            "Réponds UNIQUEMENT avec le CV reformaté, sans commentaires ni explications.",
        },
        {
          role: 'user',
          content: `Voici mon CV :\n\n${cv}\n\n---\n\nVoici l'offre d'emploi :\n\n${offer}`,
        },
      ],
    })

    const reformatted = completion.choices[0].message.content
    return Response.json({ reformatted })
  } catch (err) {
    console.error('analyze error:', err)
    return Response.json({ error: err.message || 'Erreur interne.' }, { status: 500 })
  }
}
