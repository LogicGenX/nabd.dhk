export default function Navbar() {
  return (
    <nav className="p-4 border-b border-gray-200 flex justify-between">
      <a href="/" className="font-bold">nabd.dhk</a>
      <div className="space-x-4">
        <a href="/shop">Shop</a>
        <a href="/cart">Cart</a>
        <a href="/contact">Contact</a>
      </div>
    </nav>
  )
}
