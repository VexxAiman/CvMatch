import './globals.css'

export const metadata = {
  title: 'CVMatch — Optimisez votre CV avec l\'IA',
  description: 'Coach carrière IA pour étudiants et jeunes professionnels français. Reformatez votre CV pour chaque offre d\'emploi en quelques secondes.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  )
}
