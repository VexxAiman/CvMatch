import './globals.css'

export const metadata = {
  title: 'CVMatch — Coach carrière IA',
  description: 'Optimisez votre CV pour chaque offre d\'emploi grâce à l\'IA.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  )
}
