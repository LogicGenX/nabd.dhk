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
      {/* Scrim (click to close when not full-screen) */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Full-screen mobile sheet */}
      <aside
        ref={ref}
        className={`fixed inset-0 z-50 w-screen h-screen bg-white md:hidden flex flex-col transform transition-transform duration-300 ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        role='dialog'
        aria-modal='true'
        aria-label='Filter options'
      >
        <div className='sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b bg-white'>
          <h3 className='text-lg font-semibold'>{title}</h3>
          <button
            className='flex items-center gap-2 px-3 py-2 rounded-full border hover:bg-gray-50'
            onClick={onClose}
            aria-label='Close filters'
          >
            <FaTimes />
            <span>Close</span>
          </button>
        </div>
        <div className='flex-1 overflow-y-auto overflow-x-hidden px-4 pt-3 pb-6 space-y-6 w-full max-w-full'>
          {children}
        </div>
      </aside>
    </>
  )
}
