import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import Navbar from '../Navbar'
import SearchOverlay from './index'

describe('SearchOverlay', () => {
  it('opens from navbar icon', async () => {
    const user = userEvent.setup()
    render(<Navbar />)
    const btn = screen.getByLabelText('Search')
    await user.click(btn)
    expect(screen.getByRole('dialog', { name: 'Search overlay' })).toBeInTheDocument()
  })

  it('mirrors close button in RTL', () => {
    cleanup()
    render(
      <div dir='rtl'>
        <SearchOverlay open onClose={() => {}} />
      </div>
    )
    const btn = screen.getByLabelText('Close search')
    expect(btn.className).toContain('rtl:left-4')
  })
})
