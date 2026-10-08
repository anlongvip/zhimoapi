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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { ApplicationDialog } from '../components/application-dialog'

vi.mock('@/lib/api', () => ({ api: { request: vi.fn() } }))

const orders = [
  {
    id: 1,
    trade_no: 'paid-one',
    money: 300,
    payment_method: 'alipay',
    create_time: 1,
  },
  {
    id: 2,
    trade_no: 'paid-two',
    money: 200,
    payment_method: 'alipay',
    create_time: 2,
  },
]
function renderApplication() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const onClose = vi.fn()
  render(
    <QueryClientProvider client={client}>
      <ApplicationDialog
        config={{
          id: 1,
          enabled: true,
          minimum_cents: 50000,
          notice: 'Manual review',
        }}
        onClose={onClose}
      />
    </QueryClientProvider>
  )
  return { onClose, user: userEvent.setup() }
}

describe('Invoice application', () => {
  it('combines paid orders and submits only selected IDs and billing details', async () => {
    vi.mocked(api.request).mockImplementation(
      async (request) =>
        ({
          data: {
            success: true,
            data:
              request.method === 'get'
                ? { items: orders, total: 2 }
                : { id: 1 },
          },
        }) as Awaited<ReturnType<typeof api.request>>
    )
    const { user, onClose } = renderApplication()
    const submit = screen.getByRole('button', {
      name: 'Submit invoice application',
    })
    expect(submit).toBeDisabled()
    await user.click(await screen.findByRole('checkbox', { name: /paid-one/ }))
    expect(submit).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /paid-two/ }))
    expect(submit).toBeEnabled()
    await user.type(
      screen.getByRole('textbox', { name: /Company name/ }),
      'Example Company'
    )
    await user.type(
      screen.getByRole('textbox', { name: /Tax number/ }),
      '91310000123456789X'
    )
    await user.click(submit)
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(api.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'post',
        data: expect.objectContaining({
          order_ids: [1, 2],
          company_name: 'Example Company',
          tax_number: '91310000123456789X',
        }),
      })
    )
  })

  it('shows the empty state and disables submission when no paid orders exist', async () => {
    vi.mocked(api.request).mockResolvedValue({
      data: { success: true, data: { items: [], total: 0 } },
    } as Awaited<ReturnType<typeof api.request>>)
    renderApplication()
    expect(await screen.findByText('No eligible paid orders')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Submit invoice application' })
    ).toBeDisabled()
  })

  it('retains the draft after a rejected submission and exposes invalid tax numbers', async () => {
    vi.mocked(api.request).mockImplementation(async (request) => {
      if (request.method === 'get') {
        return {
          data: { success: true, data: { items: orders, total: 2 } },
        } as Awaited<ReturnType<typeof api.request>>
      }
      throw new Error('Order already claimed')
    })
    const { user, onClose } = renderApplication()
    await user.click(await screen.findByRole('checkbox', { name: /paid-one/ }))
    await user.click(screen.getByRole('checkbox', { name: /paid-two/ }))
    await user.type(
      screen.getByRole('textbox', { name: /Company name/ }),
      'Example Company'
    )
    const tax = screen.getByRole('textbox', { name: /Tax number/ })
    await user.type(tax, 'invalid')
    await user.click(
      screen.getByRole('button', { name: 'Submit invoice application' })
    )
    expect(
      await screen.findByText(
        'Tax number must contain 15 to 20 letters or digits'
      )
    ).toBeVisible()
    expect(tax).toHaveAttribute('aria-invalid', 'true')
    await user.clear(tax)
    await user.type(tax, '91310000123456789X')
    await user.click(
      screen.getByRole('button', { name: 'Submit invoice application' })
    )
    await waitFor(() =>
      expect(api.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'post' })
      )
    )
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Submit invoice application' })
      ).toBeEnabled()
    )
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: /Company name/ })).toHaveValue(
      'Example Company'
    )
  })
})
