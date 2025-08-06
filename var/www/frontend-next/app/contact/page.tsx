import { sanity } from '../../lib/sanity'

export default async function ContactPage() {
  const siteSettings =
    (await sanity.fetch(
      `*[_type == "siteSettings"][0]{contactEmail, instagramUrl}`
    )) || {}

  const { contactEmail, instagramUrl } = siteSettings as {
    contactEmail?: string
    instagramUrl?: string
  }

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold mb-4 tracking-wider">Contact</h1>
      <div className="space-y-2">
        <p>
          {contactEmail ? (
            <a href={`mailto:${contactEmail}`} className="underline">
              {contactEmail}
            </a>
          ) : (
            'Email not available'
          )}
        </p>
        <p>
          {instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Instagram
            </a>
          ) : (
            'Instagram not available'
          )}
        </p>
      </div>
      <form className="space-y-4 max-w-md">
        <input type="email" placeholder="Email" className="w-full border p-2" />
        <textarea placeholder="Message" className="w-full border p-2" rows={4} />
        <button className="bg-black text-white px-4 py-2" type="submit">Send</button>
      </form>
    </main>
  )
}
