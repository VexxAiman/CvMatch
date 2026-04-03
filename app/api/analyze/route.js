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
            "Tu es un expert RH senior avec 15 ans d'expérience en recrutement en France. Tu es OBSÉDÉ par les détails et tu ne fais JAMAIS d'erreurs.\n\n" +
            "RÈGLES ABSOLUES - ne jamais les violer:\n" +
            "1. TOUJOURS conserver exactement: nom complet, prénom, email, téléphone, ville - ne JAMAIS les supprimer ou modifier\n" +
            "2. TOUJOURS quantifier chaque expérience avec des chiffres (si pas de chiffres dans le CV original, estime de façon réaliste: durées, pourcentages, volumes, équipes)\n" +
            "3. TOUJOURS utiliser des verbes d'action forts au début de chaque bullet: Développé, Optimisé, Piloté, Réduit, Augmenté, Géré, Conçu, Déployé, Analysé, Coordonné\n" +
            "4. TOUJOURS intégrer les 8-10 mots-clés les plus importants de l'offre naturellement dans le texte\n" +
            "5. TOUJOURS respecter cet ordre de sections: NOM/CONTACT, PROFIL (3 lignes max), EXPÉRIENCES, FORMATION, COMPÉTENCES, LANGUES\n" +
            "6. JAMAIS supprimer une expérience professionnelle complète - reformuler seulement\n" +
            "7. Le profil doit mentionner exactement le titre du poste visé et 2-3 compétences clés de l'offre\n" +
            "8. Maximum une page - être concis mais percutant\n\n" +
            "FORMAT DE RÉPONSE: Retourne UNIQUEMENT le CV reformaté, sans introduction, sans commentaires, sans explications. Commence directement par le nom du candidat.",
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
