export default function CheckoutPage() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold mb-4 tracking-wider">Checkout</h1>
      <form className="space-y-4 max-w-md">
        <input type="text" placeholder="Name" className="w-full border p-2" />
        <input type="text" placeholder="Address" className="w-full border p-2" />
        <select className="w-full border p-2">
          <option value="bkash">bKash</option>
          <option value="cod">Cash on Delivery</option>
        </select>
        <button type="submit" className="w-full bg-black text-white py-2">Place order</button>
      </form>
    </main>
  )
}
