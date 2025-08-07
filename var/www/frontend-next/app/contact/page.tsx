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
    <main className="p-xl space-y-md">
      <h1 className="text-3xl font-bold mb-md tracking-wider">Contact</h1>
      <div className="space-y-xs">
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
      <form className="space-y-md max-w-md">
        <input type="email" placeholder="Email" className="w-full border p-xs" />
        <textarea placeholder="Message" className="w-full border p-xs" rows={4} />
        <button className="bg-brand-primary text-white px-md py-xs" type="submit">Send</button>
      </form>
    </main>
  )
}
