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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { invoiceRequest } from '../api'
import type { InvoiceConfig } from '../types'

const schema = z.object({
  enabled: z.boolean(),
  minimum: z.number().min(0.01).max(1000000000),
  notice: z.string().max(2000),
})
type SettingsValues = z.infer<typeof schema>
export function InvoiceSettingsDialog(props: {
  config: InvoiceConfig
  onClose: () => void
}) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const form = useForm<SettingsValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      enabled: props.config.enabled,
      minimum: props.config.minimum_cents / 100,
      notice: props.config.notice,
    },
  })
  const mutation = useMutation({
    mutationFn: (values: SettingsValues) =>
      invoiceRequest('put', '/admin/settings', {
        enabled: values.enabled,
        minimum_cents: Math.round(values.minimum * 100),
        notice: values.notice,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['invoices'] })
      toast.success(t('Invoice settings saved'))
      props.onClose()
    },
  })
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) props.onClose()
      }}
      title={t('Invoice settings')}
      footer={
        <Button
          form='invoice-settings'
          type='submit'
          disabled={mutation.isPending}
        >
          {t('Save')}
        </Button>
      }
    >
      <form
        id='invoice-settings'
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <FieldGroup>
          <Field orientation='horizontal'>
            <Checkbox
              id='invoice-enabled'
              checked={form.watch('enabled')}
              onCheckedChange={(checked) =>
                form.setValue('enabled', checked === true)
              }
              disabled={mutation.isPending}
            />
            <FieldLabel htmlFor='invoice-enabled'>
              {t('Enable invoice applications')}
            </FieldLabel>
          </Field>
          <Field data-invalid={!!form.formState.errors.minimum}>
            <FieldLabel htmlFor='invoice-minimum'>
              {t('Minimum invoice amount (CNY)')}
            </FieldLabel>
            <Input
              id='invoice-minimum'
              type='number'
              step='0.01'
              min='0.01'
              {...form.register('minimum', { valueAsNumber: true })}
              disabled={mutation.isPending}
              aria-invalid={!!form.formState.errors.minimum}
            />
            {form.formState.errors.minimum && (
              <FieldError>{t('Please check this field')}</FieldError>
            )}
          </Field>
          <Field data-invalid={!!form.formState.errors.notice}>
            <FieldLabel htmlFor='invoice-notice'>
              {t('Invoice instructions')}
            </FieldLabel>
            <Textarea
              id='invoice-notice'
              maxLength={2000}
              {...form.register('notice')}
              disabled={mutation.isPending}
              aria-invalid={!!form.formState.errors.notice}
            />
            {form.formState.errors.notice && (
              <FieldError>{t('Please check this field')}</FieldError>
            )}
          </Field>
        </FieldGroup>
      </form>
    </Dialog>
  )
}
