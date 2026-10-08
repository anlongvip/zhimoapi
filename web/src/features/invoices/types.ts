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
export type InvoiceStatus =
  | 'pending'
  | 'approved'
  | 'issued'
  | 'rejected'
  | 'withdrawn'
export type Invoice = {
  id: number
  user_id: number
  company_name: string
  tax_number: string
  bank_name: string
  bank_account: string
  company_address: string
  company_phone: string
  remark: string
  amount_cents: number
  status: InvoiceStatus
  review_note: string
  reviewed_by: number
  created_at: number
  updated_at: number
  file_name: string
}
export type InvoiceOrder = {
  id: number
  top_up_id: number
  trade_no: string
  amount_cents: number
}
export type RechargeOrder = {
  id: number
  trade_no: string
  money: number
  payment_method: string
  create_time: number
}
export type InvoiceConfig = {
  id: number
  enabled: boolean
  minimum_cents: number
  notice: string
}
export type InvoiceDetail = { invoice: Invoice; orders: InvoiceOrder[] }
export type Page<T> = { items: T[]; total: number }
export const statusKeys: Record<InvoiceStatus, string> = {
  pending: 'Pending review',
  approved: 'Awaiting invoice',
  issued: 'Issued',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}
