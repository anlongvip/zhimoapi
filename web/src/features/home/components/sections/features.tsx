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
import { Building2, Check, Code2, UsersRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { cn } from '@/lib/utils'

interface FeaturesProps {
  className?: string
}

export function Features(props: FeaturesProps) {
  const { t } = useTranslation()

  const audiences = [
    {
      title: t('Individual developers'),
      description: t('Start quickly and focus on building your product.'),
      icon: <Code2 className='size-5 text-cyan-600 dark:text-cyan-400' />,
      iconClass: 'bg-cyan-500/10',
      points: [
        t('One gateway for supported models'),
        t('Manage API keys and usage in one place'),
        t('Check model pricing before use'),
      ],
    },
    {
      title: t('Teams and studios'),
      description: t('Keep team access and usage organized.'),
      icon: <UsersRound className='size-5 text-violet-600 dark:text-violet-400' />,
      iconClass: 'bg-violet-500/10',
      points: [
        t('Manage access by project'),
        t('Track team usage and costs'),
        t('Share one integration flow across your team'),
      ],
    },
    {
      title: t('Enterprise customers'),
      description: t('Support for enterprise integration and purchasing needs.'),
      icon: <Building2 className='size-5 text-teal-600 dark:text-teal-400' />,
      iconClass: 'bg-teal-500/10',
      points: [
        t('Discuss enterprise API integration'),
        t('Invoice support'),
        t('Corporate bank transfer support'),
      ],
    },
  ]

  return (
    <section className={cn('relative z-10 px-6 py-16 md:py-20', props.className)}>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-9 text-center' animation='fade-up'>
          <p className='text-primary mb-2 text-[11px] font-bold tracking-[0.16em] uppercase'>
            {t('Built for every team')}
          </p>
          <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t('From individual developers to enterprise collaboration')}
          </h2>
          <p className='text-muted-foreground mx-auto mt-3 max-w-2xl text-sm leading-relaxed md:text-base'>
            {t('Choose the service that fits your work, from personal projects to business integration.')}
          </p>
        </AnimateInView>

        <div className='grid gap-4 md:grid-cols-3'>
          {audiences.map((audience, index) => (
            <AnimateInView key={audience.title} delay={index * 110} className='h-full'>
              <article className='border-border/60 bg-card/90 h-full rounded-2xl border p-6 shadow-[0_12px_35px_-30px_rgba(15,23,42,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg'>
                <div className='mb-5 flex items-center gap-3'>
                  <div className={`flex size-11 items-center justify-center rounded-2xl ${audience.iconClass}`}>
                    {audience.icon}
                  </div>
                  <div>
                    <h3 className='text-base font-semibold'>{audience.title}</h3>
                    <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
                      {audience.description}
                    </p>
                  </div>
                </div>
                <ul className='border-border/50 space-y-3 border-t pt-4'>
                  {audience.points.map((point) => (
                    <li key={point} className='text-muted-foreground flex items-start gap-2.5 text-sm'>
                      <span className='border-primary/25 bg-primary/5 text-primary mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border'>
                        <Check className='size-3' strokeWidth={2.5} />
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
