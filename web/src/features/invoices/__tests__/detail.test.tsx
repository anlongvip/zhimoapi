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

import { InvoiceDetailDialog } from '../components/detail-dialog'

vi.mock('@/lib/api', () => ({ api: { request: vi.fn() } }))

function showDetail(admin: boolean, status: string) {
  vi.mocked(api.request).mockResolvedValue({
    data: {
      success: true,
      data: {
        invoice: { id: 1, user_id: 1, status, amount_cents: 50000 },
        orders: [],
      },
    },
  } as Awaited<ReturnType<typeof api.request>>)
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <InvoiceDetailDialog id={1} admin={admin} onClose={vi.fn()} />
    </QueryClientProvider>
  )
  return userEvent.setup()
}

describe('Invoice review', () => {
  it('requires a rejection reason and confirms the operation before sending it', async () => {
    const user = showDetail(true, 'pending')
    const reject = await screen.findByRole('button', { name: 'Reject' })
    expect(reject).toBeDisabled()
    await user.type(
      screen.getByLabelText('Review notes'),
      'Tax number incorrect'
    )
    await user.click(reject)
    expect(api.request).not.toHaveBeenCalledWith(
      expect.objectContaining({ method: 'post' })
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() =>
      expect(api.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'post',
          url: '/api/invoices/admin/1/review',
          data: { status: 'rejected', note: 'Tax number incorrect' },
        })
      )
    )
  })

  it('does not offer withdrawal or administrator actions for an approved user application', async () => {
    showDetail(false, 'approved')
    await screen.findByText(/Awaiting invoice/)
    expect(
      screen.queryByRole('button', { name: 'Withdraw application' })
    ).toBeNull()
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.queryByLabelText('PDF invoice (maximum 5 MB)')).toBeNull()
  })
})
