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
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'

import { getInvoiceOrders, submitInvoice } from '../api'
import {
  applicationSchema,
  emptyApplication,
  invoiceMoney,
  type ApplicationValues,
} from '../lib/schema'
import type { InvoiceConfig } from '../types'

const fields = [
  ['company_name', 'Company name'],
  ['tax_number', 'Tax number'],
  ['bank_name', 'Bank name'],
  ['bank_account', 'Bank account'],
  ['company_address', 'Company address'],
  ['company_phone', 'Company phone'],
  ['remark', 'Remarks'],
] as const

export function ApplicationDialog(props: {
  config: InvoiceConfig
  onClose: () => void
}) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const [page, setPage] = useState(1)
  const form = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: emptyApplication,
  })
  const selected = form.watch('order_ids')
  const [amounts, setAmounts] = useState<Record<number, number>>({})
  const orders = useQuery({
    queryKey: ['invoices', 'orders', page],
    queryFn: () => getInvoiceOrders(page),
  })
  const mutation = useMutation({
    mutationFn: submitInvoice,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['invoices'] })
      toast.success(t('Invoice application submitted'))
      props.onClose()
    },
  })
  const total = selected.reduce((sum, id) => sum + (amounts[id] ?? 0), 0)
  const choose = (id: number, money: number, checked: boolean): void => {
    setAmounts((previous) => ({ ...previous, [id]: Math.round(money * 100) }))
    form.setValue(
      'order_ids',
      checked
        ? [...selected.filter((value) => value !== id), id]
        : selected.filter((value) => value !== id),
      { shouldValidate: true }
    )
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) props.onClose()
      }}
      title={t('New invoice application')}
      description={props.config.notice}
      footer={
        <>
          <Button
            variant='outline'
            disabled={mutation.isPending}
            onClick={props.onClose}
          >
            {t('Cancel')}
          </Button>
          <Button
            type='submit'
            form='invoice-application'
            disabled={
              mutation.isPending ||
              !props.config.enabled ||
              total < props.config.minimum_cents ||
              selected.length > 100
            }
          >
            {t('Submit invoice application')}
          </Button>
        </>
      }
    >
      <form
        id='invoice-application'
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <FieldGroup>
          <FieldSet>
            <FieldLegend>{t('Select paid recharge orders')}</FieldLegend>
            <p className='text-muted-foreground text-sm'>
              {t(
                'CNY Epay orders only. Multiple orders can be combined; no extra balance deduction.'
              )}
            </p>
            {orders.isPending && <LoadingState />}
            {orders.isError && (
              <ErrorState
                onRetry={() => {
                  void orders.refetch()
                }}
              />
            )}
            {orders.data?.items.length === 0 && (
              <p>{t('No eligible paid orders')}</p>
            )}
            <div className='flex max-h-60 flex-col gap-2 overflow-y-auto'>
              {orders.data?.items.map((order) => (
                <Field key={order.id} orientation='horizontal'>
                  <Checkbox
                    id={`invoice-order-${order.id}`}
                    checked={selected.includes(order.id)}
                    disabled={mutation.isPending}
                    onCheckedChange={(checked) =>
                      choose(order.id, order.money, checked === true)
                    }
                  />
                  <FieldLabel
                    htmlFor={`invoice-order-${order.id}`}
                    className='min-w-0 flex-1 flex-wrap'
                  >
                    <span className='break-all'>{order.trade_no}</span>
                    <span>
                      {order.payment_method} ·{' '}
                      {invoiceMoney(Math.round(order.money * 100))}
                    </span>
                  </FieldLabel>
                </Field>
              ))}
            </div>
            {(orders.data?.total ?? 0) > 100 && (
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  {t('Previous')}
                </Button>
                <span>{page}</span>
                <Button
                  type='button'
                  variant='outline'
                  disabled={page * 100 >= (orders.data?.total ?? 0)}
                  onClick={() => setPage(page + 1)}
                >
                  {t('Next')}
                </Button>
              </div>
            )}
            <p aria-live='polite'>
              {t('Selected amount')}: {invoiceMoney(total)} ·{' '}
              {t('Minimum invoice amount')}:{' '}
              {invoiceMoney(props.config.minimum_cents)}
            </p>
            {form.formState.errors.order_ids && (
              <FieldError>{t('Select between 1 and 100 orders')}</FieldError>
            )}
          </FieldSet>
          <FieldGroup className='grid gap-4 sm:grid-cols-2'>
            {fields.map(([key, label]) => (
              <Field key={key} data-invalid={!!form.formState.errors[key]}>
                <FieldLabel htmlFor={`invoice-${key}`}>
                  {t(label)}
                  {(key === 'company_name' || key === 'tax_number') && ' *'}
                </FieldLabel>
                <Input
                  id={`invoice-${key}`}
                  {...form.register(key)}
                  disabled={mutation.isPending}
                  aria-invalid={!!form.formState.errors[key]}
                />
                {form.formState.errors[key] && (
                  <FieldError>
                    {key === 'tax_number'
                      ? t('Tax number must contain 15 to 20 letters or digits')
                      : t('Please check this field')}
                  </FieldError>
                )}
              </Field>
            ))}
          </FieldGroup>
        </FieldGroup>
      </form>
    </Dialog>
  )
}
