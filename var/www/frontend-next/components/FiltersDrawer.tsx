'use client'

import { useEffect, useRef } from 'react'
import { FaTimes } from 'react-icons/fa'

interface Props {
  open: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
}

export default function FiltersDrawer({ open, title = 'Filters', onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', open)
    return () => document.body.classList.remove('overflow-hidden')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <aside
        ref={ref}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl p-4 transform transition-transform duration-300 md:hidden ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        role='dialog'
        aria-modal='true'
        aria-label='Filter options'
      >
        <div className='flex items-center justify-between border-b pb-2'>
          <h3 className='text-lg font-semibold'>{title}</h3>
          <button
            className='w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100'
            onClick={onClose}
            aria-label='Close filters'
          >
            <FaTimes />
          </button>
        </div>
        <div className='max-h-[60vh] overflow-y-auto pt-3 space-y-6'>{children}</div>
      </aside>
    </>
  )
}

