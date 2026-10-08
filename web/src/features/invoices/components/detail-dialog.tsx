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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { StaticDataTable } from '@/components/data-table'
import { Dialog } from '@/components/dialog'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { downloadInvoice, getInvoiceDetail, invoiceRequest } from '../api'
import { invoiceMoney } from '../lib/schema'
import { statusKeys } from '../types'

export function InvoiceDetailDialog(props: {
  id: number
  admin: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [action, setAction] = useState<
    'approved' | 'rejected' | 'withdrawn' | 'issued' | null
  >(null)
  const detail = useQuery({
    queryKey: ['invoices', 'detail', props.admin, props.id],
    queryFn: () => getInvoiceDetail(props.admin, props.id),
  })
  const mutation = useMutation({
    mutationFn: async (target: NonNullable<typeof action>) => {
      if (target === 'withdrawn') {
        return invoiceRequest('post', `/${props.id}/withdraw`)
      }
      if (target === 'issued') {
        const data = new FormData()
        if (!file) throw new Error(t('Select a PDF invoice'))
        data.append('file', file)
        data.append('note', note)
        return invoiceRequest('post', `/admin/${props.id}/file`, data)
      }
      return invoiceRequest('post', `/admin/${props.id}/review`, {
        status: target,
        note,
      })
    },
    onSuccess: () => {
      setAction(null)
      void client.invalidateQueries({ queryKey: ['invoices'] })
      toast.success(t('Invoice application updated'))
    },
  })
  const download = useMutation({
    mutationFn: () => {
      if (!detail.data) throw new Error(t('Invoice unavailable'))
      return downloadInvoice(props.admin, detail.data.invoice)
    },
  })
  const invoice = detail.data?.invoice
  const textFields = [
    'company_name',
    'tax_number',
    'bank_name',
    'bank_account',
    'company_address',
    'company_phone',
    'remark',
    'review_note',
  ] as const
  const labels = [
    'Company name',
    'Tax number',
    'Bank name',
    'Bank account',
    'Company address',
    'Company phone',
    'Remarks',
    'Review notes',
  ]
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) props.onClose()
        }}
        title={t('Invoice application details')}
      >
        {detail.isPending && <LoadingState />}
        {detail.isError && (
          <ErrorState
            onRetry={() => {
              void detail.refetch()
            }}
          />
        )}
        {invoice && (
          <div className='flex flex-col gap-4'>
            <p>
              #{invoice.id} · {t(statusKeys[invoice.status])} ·{' '}
              {invoiceMoney(invoice.amount_cents)} · {t('User ID')}:{' '}
              {invoice.user_id}
            </p>
            <dl className='grid gap-3 sm:grid-cols-2'>
              {textFields.map((key, index) => (
                <div key={key} className='min-w-0'>
                  <dt className='text-muted-foreground text-sm'>
                    {t(labels[index])}
                  </dt>
                  <dd className='break-all whitespace-pre-wrap'>
                    {invoice[key] || '—'}
                  </dd>
                </div>
              ))}
            </dl>
            <StaticDataTable
              data={detail.data?.orders ?? []}
              getRowKey={(order) => order.id}
              columns={[
                {
                  id: 'trade_no',
                  header: t('Order number'),
                  cell: (order) => order.trade_no,
                },
                {
                  id: 'amount',
                  header: t('Amount'),
                  cell: (order) => invoiceMoney(order.amount_cents),
                },
              ]}
            />
            {props.admin &&
              (invoice.status === 'pending' ||
                invoice.status === 'approved') && (
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor='invoice-review-note'>
                      {t('Review notes')}
                    </FieldLabel>
                    <Textarea
                      id='invoice-review-note'
                      maxLength={1000}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      disabled={mutation.isPending}
                    />
                  </Field>
                  {invoice.status === 'approved' && (
                    <Field>
                      <FieldLabel htmlFor='invoice-file'>
                        {t('PDF invoice (maximum 5 MB)')}
                      </FieldLabel>
                      <Input
                        id='invoice-file'
                        type='file'
                        accept='.pdf,application/pdf'
                        disabled={mutation.isPending}
                        onChange={(event) =>
                          setFile(event.target.files?.[0] ?? null)
                        }
                      />
                      {file &&
                        (file.size > 5 * 1024 * 1024 ||
                          !file.name.toLowerCase().endsWith('.pdf')) && (
                          <p role='alert'>
                            {t('Select a PDF invoice up to 5 MB')}
                          </p>
                        )}
                    </Field>
                  )}
                </FieldGroup>
              )}
            <div className='flex flex-wrap gap-2'>
              {!props.admin && invoice.status === 'pending' && (
                <Button
                  variant='outline'
                  disabled={mutation.isPending}
                  onClick={() => setAction('withdrawn')}
                >
                  {t('Withdraw application')}
                </Button>
              )}
              {props.admin && invoice.status === 'pending' && (
                <Button
                  disabled={mutation.isPending}
                  onClick={() => setAction('approved')}
                >
                  {t('Approve')}
                </Button>
              )}
              {props.admin &&
                (invoice.status === 'pending' ||
                  invoice.status === 'approved') && (
                  <Button
                    variant='destructive'
                    disabled={mutation.isPending || !note.trim()}
                    onClick={() => setAction('rejected')}
                  >
                    {t('Reject')}
                  </Button>
                )}
              {props.admin && invoice.status === 'approved' && (
                <Button
                  disabled={
                    mutation.isPending ||
                    !file ||
                    file.size === 0 ||
                    file.size > 5 * 1024 * 1024 ||
                    !file.name.toLowerCase().endsWith('.pdf')
                  }
                  onClick={() => setAction('issued')}
                >
                  {t('Upload and mark issued')}
                </Button>
              )}
              {invoice.status === 'issued' && (
                <Button
                  disabled={download.isPending}
                  onClick={() => download.mutate()}
                >
                  {t('Download invoice')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>
      <ConfirmDialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setAction(null)
        }}
        title={t('Confirm invoice operation')}
        desc={t(
          'Check the invoice information before continuing. Issued invoices cannot be withdrawn here.'
        )}
        isLoading={mutation.isPending}
        handleConfirm={() => {
          if (action) mutation.mutate(action)
        }}
      />
    </>
  )
}
