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
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'

export function CTA() {
  const { t } = useTranslation()

  return (
    <section className='relative z-10 overflow-hidden px-6 py-8 md:py-12'>
      <AnimateInView className='mx-auto max-w-6xl' animation='fade-up'>
        <div className='relative grid items-center gap-7 overflow-hidden rounded-3xl bg-[#10233d] px-7 py-9 text-white md:grid-cols-[1fr_auto] md:px-10 md:py-11'>
          <div aria-hidden className='pointer-events-none absolute -right-20 -top-40 size-[26rem] rounded-full border border-white/10 shadow-[0_0_0_2rem_rgba(255,255,255,0.025),0_0_0_4rem_rgba(255,255,255,0.02)]' />
          <div className='relative'>
            <h2 className='text-xl font-bold tracking-tight md:text-2xl'>
              {t('For enterprise projects, clearer integration and service')}
            </h2>
            <p className='mt-3 max-w-3xl text-sm leading-relaxed text-slate-300'>
              {t('Contact us to discuss integration, invoices, and corporate payments.')}
            </p>
            <div className='mt-5 flex flex-wrap gap-2'>
              {[t('Unified API access'), t('Usage and cost management'), t('Invoice support'), t('Corporate bank transfer support')].map((item) => (
                <span key={item} className='rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200'>
                  {item}
                </span>
              ))}
            </div>
          </div>
          <Button
            className='relative h-11 rounded-xl bg-white px-5 font-semibold text-slate-900 hover:bg-slate-100'
            render={<Link to='/about/' />}
          >
            {t('Contact us')}
            <ArrowRight className='ml-1.5 size-4' />
          </Button>
        </div>
      </AnimateInView>
    </section>
  )
}
