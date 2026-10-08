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
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  DataTableView,
  DataTablePagination,
  useDataTable,
} from '@/components/data-table'
import { ErrorState } from '@/components/error-state'
import { Main } from '@/components/layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

import { getInvoiceConfig, getInvoices } from './api'
import { ApplicationDialog } from './components/application-dialog'
import { InvoiceDetailDialog } from './components/detail-dialog'
import { InvoiceSettingsDialog } from './components/settings-dialog'
import { invoiceMoney } from './lib/schema'
import { statusKeys, type Invoice } from './types'

export function Invoices(props: { admin?: boolean }) {
  const { t } = useTranslation()
  const admin = props.admin === true
  const [status, setStatus] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [creating, setCreating] = useState(false)
  const [settings, setSettings] = useState(false)
  const [detail, setDetail] = useState<number | null>(null)
  const config = useQuery({
    queryKey: ['invoices', 'settings'],
    queryFn: getInvoiceConfig,
  })
  const list = useQuery({
    queryKey: ['invoices', 'list', admin, pagination, status],
    queryFn: () =>
      getInvoices(admin, pagination.pageIndex + 1, pagination.pageSize, status),
  })
  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      { accessorKey: 'id', header: 'ID' },
      ...(admin ? [{ accessorKey: 'user_id', header: t('User ID') }] : []),
      { accessorKey: 'company_name', header: t('Company name') },
      { accessorKey: 'tax_number', header: t('Tax number') },
      {
        accessorKey: 'amount_cents',
        header: t('Amount'),
        cell: ({ row }) => invoiceMoney(row.original.amount_cents),
      },
      {
        accessorKey: 'status',
        header: t('Status'),
        cell: ({ row }) => (
          <Badge variant='secondary'>
            {t(statusKeys[row.original.status])}
          </Badge>
        ),
      },
      {
        accessorKey: 'created_at',
        header: t('Application time'),
        cell: ({ row }) =>
          dayjs.unix(row.original.created_at).format('YYYY-MM-DD HH:mm'),
      },
      {
        accessorKey: 'updated_at',
        header: t('Updated at'),
        cell: ({ row }) =>
          dayjs.unix(row.original.updated_at).format('YYYY-MM-DD HH:mm'),
      },
      {
        id: 'actions',
        header: t('Actions'),
        cell: ({ row }) => (
          <Button
            variant='outline'
            size='sm'
            onClick={() => setDetail(row.original.id)}
          >
            {t('Details')}
          </Button>
        ),
      },
    ],
    [admin, t]
  )
  const { table } = useDataTable({
    data: list.data?.items ?? [],
    columns,
    totalCount: list.data?.total ?? 0,
    manualPagination: true,
    pagination,
    onPaginationChange: setPagination,
  })
  return (
    <Main className='overflow-y-auto p-3 sm:p-5'>
      <div className='flex flex-col gap-6'>
        <div>
          <h1 className='text-2xl font-semibold'>
            {admin ? t('Invoice management') : t('Invoice applications')}
          </h1>
          <p className='text-muted-foreground'>
            {t(
              'Select paid recharge orders, submit billing details and download issued invoices.'
            )}
          </p>
        </div>
        {config.data && (
          <Alert>
            <AlertDescription>
              {config.data.notice} {t('Minimum invoice amount')}:{' '}
              {invoiceMoney(config.data.minimum_cents)}
              {!config.data.enabled &&
                ` · ${t('Invoice applications are currently closed')}`}
            </AlertDescription>
          </Alert>
        )}
        {config.isError && (
          <ErrorState
            onRetry={() => {
              void config.refetch()
            }}
          />
        )}
        <div className='flex flex-wrap items-center gap-3'>
          {!admin && (
            <Button
              disabled={!config.data?.enabled}
              onClick={() => setCreating(true)}
            >
              {t('Apply for invoice')}
            </Button>
          )}
          {admin && (
            <Button
              variant='outline'
              disabled={!config.data}
              onClick={() => setSettings(true)}
            >
              {t('Invoice settings')}
            </Button>
          )}
          <Button
            variant='outline'
            disabled={list.isFetching}
            onClick={() => {
              void list.refetch()
            }}
          >
            {t('Refresh')}
          </Button>
          <NativeSelect
            aria-label={t('Filter by application status')}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPagination((previous) => ({ ...previous, pageIndex: 0 }))
            }}
          >
            <NativeSelectOption value=''>
              {t('All statuses')}
            </NativeSelectOption>
            {Object.entries(statusKeys).map(([value, label]) => (
              <NativeSelectOption key={value} value={value}>
                {t(label)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        {list.isError ? (
          <ErrorState
            onRetry={() => {
              void list.refetch()
            }}
          />
        ) : (
          <>
            <DataTableView
              table={table}
              isLoading={list.isPending}
              emptyTitle={t('No invoice applications')}
            />
            <DataTablePagination table={table} />
          </>
        )}
        {creating && config.data && (
          <ApplicationDialog
            config={config.data}
            onClose={() => setCreating(false)}
          />
        )}
        {settings && config.data && (
          <InvoiceSettingsDialog
            config={config.data}
            onClose={() => setSettings(false)}
          />
        )}
        {detail !== null && (
          <InvoiceDetailDialog
            id={detail}
            admin={admin}
            onClose={() => setDetail(null)}
          />
        )}
      </div>
    </Main>
  )
}
