import pdfParse from 'pdf-parse'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf')

    if (!file || file.type !== 'application/pdf') {
      return Response.json({ error: 'Fichier PDF requis.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const data = await pdfParse(buffer)

    return Response.json({ text: data.text })
  } catch (err) {
    console.error('parse-pdf error:', err)
    return Response.json({ error: err.message || 'Erreur lors de la lecture du PDF.' }, { status: 500 })
  }
}
