'use client'

import { useState, type ChangeEvent } from 'react'

interface Props {
  images: string[]
  thumbnail?: string | null
  onChange: (next: string[]) => void
  onSelectThumbnail: (url: string) => void
}

export default function ProductImageManager({ images, thumbnail, onChange, onSelectThumbnail }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => {
        formData.append('files', file)
      })
      const response = await fetch('/api/lite/uploads', {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.message || 'Upload failed')
      }
      const payload = await response.json()
      const newUrls = (payload?.uploads || [])
        .map((entry: { url?: string | null }) => entry?.url)
        .filter((url: string | null | undefined): url is string => Boolean(url))
      if (newUrls.length) {
        onChange([...images, ...newUrls])
        if (!thumbnail && newUrls[0]) {
          onSelectThumbnail(newUrls[0])
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const removeImage = (url: string) => {
    const next = images.filter((image) => image !== url)
    onChange(next)
    if (thumbnail === url) {
      onSelectThumbnail(next[0] || '')
    }
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center gap-3'>
        <label className='rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100'>
          <input type='file' multiple className='hidden' onChange={onFilesSelected} accept='image/*' />
          {uploading ? 'Uploading…' : 'Upload images'}
        </label>
        {error && <span className='text-sm text-rose-600'>{error}</span>}
      </div>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'>
        {images.map((url) => (
          <div key={url} className='relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
            <img src={url} alt='' className='h-40 w-full object-cover' />
            <div className='absolute inset-x-0 bottom-0 flex justify-between bg-black/60 px-2 py-1 text-xs text-white'>
              <button type='button' onClick={() => onSelectThumbnail(url)} className={thumbnail === url ? 'font-semibold uppercase' : ''}>
                {thumbnail === url ? 'Thumbnail' : 'Set thumbnail'}
              </button>
              <button type='button' onClick={() => removeImage(url)} className='text-rose-200 hover:text-rose-100'>
                Remove
              </button>
            </div>
          </div>
        ))}
        {!images.length && <p className='col-span-full text-sm text-slate-500'>No images uploaded yet.</p>}
      </div>
    </div>
  )
}
