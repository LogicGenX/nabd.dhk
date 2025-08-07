import '../app/globals.css'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import localFont from 'next/font/local'

const grotesk = localFont({
  src: '../public/fonts/Grotesk.ttf',
  variable: '--font-grotesk',
  display: 'swap',
  fallback: ['sans-serif'],
})

const arabicFont = localFont({
  src: '../public/fonts/ArabicFont.ttf',
  variable: '--font-arabic',
  display: 'swap',
  fallback: ['sans-serif'],
})

export const metadata = {
  title: 'nabd.dhk',
  description: 'Fashion boutique'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${grotesk.variable} ${arabicFont.variable} font-grotesk min-h-screen flex flex-col`}>
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
