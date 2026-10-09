/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Turnstile } from '../turnstile'

afterEach(() => {
  cleanup()
  delete window.turnstile
})

describe('Turnstile login presentation', () => {
  it('uses flexible width and the page theme without rerendering on callback changes', () => {
    const renderWidget = vi.fn(
      (_element: HTMLElement, _options: Record<string, unknown>) => 'widget-id'
    )
    const remove = vi.fn()
    window.turnstile = { render: renderWidget, remove }
    const onVerify = vi.fn()
    const { rerender, unmount } = render(
      <Turnstile
        siteKey='test-site'
        size='flexible'
        theme='dark'
        onVerify={onVerify}
      />
    )
    expect(renderWidget).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ size: 'flexible', theme: 'dark' })
    )
    rerender(
      <Turnstile
        siteKey='test-site'
        size='flexible'
        theme='dark'
        onVerify={vi.fn()}
      />
    )
    expect(renderWidget).toHaveBeenCalledTimes(1)
    unmount()
    expect(remove).toHaveBeenCalledWith('widget-id')
  })

  it('renders after an existing Cloudflare script finishes loading', () => {
    const script = document.createElement('script')
    script.id = 'cf-turnstile'
    document.head.appendChild(script)
    const renderWidget = vi.fn(
      (_element: HTMLElement, _options: Record<string, unknown>) => 'widget-id'
    )
    const onVerify = vi.fn()
    const onExpire = vi.fn()
    render(
      <Turnstile siteKey='test-site' onVerify={onVerify} onExpire={onExpire} />
    )
    window.turnstile = { render: renderWidget, remove: vi.fn() }
    script.dispatchEvent(new Event('load'))
    const options = renderWidget.mock.calls[0]?.[1]
    expect(options).toEqual(expect.objectContaining({ size: 'normal' }))
    script.remove()
  })
})
