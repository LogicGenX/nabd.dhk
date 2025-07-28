export default function ContactPage() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold mb-4 tracking-wider">Contact</h1>
      <form className="space-y-4 max-w-md">
        <input type="email" placeholder="Email" className="w-full border p-2" />
        <textarea placeholder="Message" className="w-full border p-2" rows={4} />
        <button className="bg-black text-white px-4 py-2" type="submit">Send</button>
      </form>
    </main>
  )
}
