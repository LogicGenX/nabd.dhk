'use client';

import { useEffect, useState } from 'react';
import { sanity } from '../../lib/sanity';

export default function ContactPage() {
  const [form, setForm] = useState({ email: '', message: '' });
  const [errors, setErrors] = useState<{ email?: string; message?: string }>(
    {},
  );
  const [contactInfo, setContactInfo] = useState<{
    contactEmail?: string;
    instagramUrl?: string;
  }>({});

  useEffect(() => {
    sanity
      .fetch(`*[_type == "siteSettings"][0]{contactEmail, instagramUrl}`)
      .then((data) => setContactInfo(data || {}));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!form.email) newErrors.email = 'Email is required';
    else if (!/^[\w.-]+@([\w-]+\.)+[\w-]{2,}$/.test(form.email))
      newErrors.email = 'Enter a valid email';
    if (!form.message) newErrors.message = 'Message is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      // handle submission
    }
  };

  const { contactEmail, instagramUrl } = contactInfo;

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-3xl font-bold mb-4 tracking-brand">Contact</h1>
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
      <form className="space-y-4 max-w-md" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="contact-email" className="block mb-1">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className={`w-full border p-2 ${
              errors.email ? 'border-black' : 'border-gray-700'
            }`}
          />
          {errors.email && <p className="text-gray-700">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="contact-message" className="block mb-1">
            Message
          </label>
          <textarea
            id="contact-message"
            name="message"
            value={form.message}
            onChange={handleChange}
            className={`w-full border p-2 ${
              errors.message ? 'border-black' : 'border-gray-700'
            }`}
            rows={4}
          />
          {errors.message && <p className="text-gray-700">{errors.message}</p>}
        </div>
        <button className="bg-black text-white px-4 py-2" type="submit">
          Send
        </button>
      </form>
    </main>
  );
}
