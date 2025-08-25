import './globals.css'

export const metadata = {
  title: 'Creative Pixel Art',
  description: 'Build on what others have created - every pixel tells a story',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
