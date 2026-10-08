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
import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import type { ApplicationValues } from './lib/schema'
import type {
  Invoice,
  InvoiceConfig,
  InvoiceDetail,
  Page,
  RechargeOrder,
} from './types'

export async function invoiceRequest<T>(
  method: 'get' | 'post' | 'put',
  path: string,
  data?: unknown
): Promise<T> {
  const response = await api.request<{
    success: boolean
    message?: string
    data: T
  }>({ method, url: `/api/invoices${path}`, data })
  return requireServerSuccess(response.data).data
}
export const getInvoiceConfig = (): Promise<InvoiceConfig> =>
  invoiceRequest('get', '/settings')
export const getInvoices = (
  admin: boolean,
  page: number,
  size: number,
  status: string
): Promise<Page<Invoice>> =>
  invoiceRequest(
    'get',
    `${admin ? '/admin' : ''}?page=${page}&page_size=${size}&status=${encodeURIComponent(status)}`
  )
export const getInvoiceOrders = (page: number): Promise<Page<RechargeOrder>> =>
  invoiceRequest('get', `/orders?page=${page}&page_size=100`)
export const getInvoiceDetail = (
  admin: boolean,
  id: number
): Promise<InvoiceDetail> =>
  invoiceRequest('get', `${admin ? '/admin' : ''}/${id}`)
export const submitInvoice = (data: ApplicationValues): Promise<Invoice> =>
  invoiceRequest('post', '', data)
export async function downloadInvoice(
  admin: boolean,
  invoice: Invoice
): Promise<void> {
  const response = await api.get<Blob>(
    `/api/invoices${admin ? '/admin' : ''}/${invoice.id}/file`,
    { responseType: 'blob' }
  )
  const url = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = invoice.file_name
  anchor.click()
  URL.revokeObjectURL(url)
}
