export default function CheckoutPage() {
  return (
    <main className="p-xl space-y-md">
      <h1 className="text-3xl font-bold mb-md tracking-wider">Checkout</h1>
      <form className="space-y-md max-w-md">
        <input type="text" placeholder="Name" className="w-full border p-xs" />
        <input type="text" placeholder="Address" className="w-full border p-xs" />
        <select className="w-full border p-xs">
          <option value="bkash">bKash</option>
          <option value="cod">Cash on Delivery</option>
        </select>
        <button type="submit" className="w-full bg-brand-primary text-white py-xs">Place order</button>
      </form>
    </main>
  )
}
