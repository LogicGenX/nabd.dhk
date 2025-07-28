export default function Footer() {
  return (
    <footer className="border-t border-gray-200 text-center text-sm p-8 space-y-4">
      <p className="max-w-xl mx-auto">
        Drawing inspiration from contemporary global trends, we create timeless pieces with impeccable craftsmanship, proudly produced right here at home
      </p>
      <nav className="flex justify-center space-x-6 text-gray-600">
        <a href="/story">About</a>
        <a href="/terms">Terms & Conditions</a>
        <a href="/privacy">Privacy Policy</a>
      </nav>
      <p>aiowardrobes@gmail.com</p>
      <p>Dhaka, Bangladesh</p>
      <div>© {new Date().getFullYear()} nabd.dhk</div>
    </footer>
  )
}
