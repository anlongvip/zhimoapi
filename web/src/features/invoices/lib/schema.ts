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
import { z } from 'zod'

export const applicationSchema = z.object({
  order_ids: z.array(z.number().int().positive()).min(1).max(100),
  company_name: z.string().trim().min(1).max(200),
  tax_number: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{15,20}$/),
  bank_name: z.string().trim().max(200),
  bank_account: z.string().trim().max(100),
  company_address: z.string().trim().max(300),
  company_phone: z.string().trim().max(50),
  remark: z.string().trim().max(1000),
})
export type ApplicationValues = z.infer<typeof applicationSchema>
export const emptyApplication: ApplicationValues = {
  order_ids: [],
  company_name: '',
  tax_number: '',
  bank_name: '',
  bank_account: '',
  company_address: '',
  company_phone: '',
  remark: '',
}
export function invoiceMoney(cents: number): string {
  // Invoice amounts are explicitly CNY, independent of quota display settings.
  return `¥${(cents / 100).toFixed(2)}`
}
