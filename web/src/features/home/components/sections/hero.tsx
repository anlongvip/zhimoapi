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
import { ArrowRight, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'
import { getLobeIcon } from '@/lib/lobe-icon'

import { AI_MODELS } from '../constants'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { logo } = useSystemConfig()
  const docsUrl =
    (status?.docs_link as string | undefined) || 'https://docs.newapi.pro'

  const renderDocsButton = () => {
    const button = (
      <Button
        variant='outline'
        className='group border-border/50 hover:border-border hover:bg-muted/50 inline-flex h-11 items-center gap-1.5 rounded-xl px-5 text-sm font-medium'
        render={<a href={docsUrl} target='_blank' rel='noopener noreferrer' />}
      >
        <BookOpen className='text-muted-foreground/80 group-hover:text-foreground size-4 transition-colors duration-200' />
        <span>{t('View documentation')}</span>
      </Button>
    )
    return button
  }

  const tickerModels = [...AI_MODELS, ...AI_MODELS]

  return (
    <section className={cn('relative z-10 overflow-hidden px-6 pt-24 pb-16 md:pt-28 md:pb-20 lg:pt-32', props.className)}>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 opacity-25 dark:opacity-[0.12]'
        style={{
          background: [
            'radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.72 0.18 250 / 80%) 0%, transparent 70%)',
            'radial-gradient(ellipse 50% 40% at 80% 15%, oklch(0.65 0.15 200 / 60%) 0%, transparent 70%)',
            'radial-gradient(ellipse 40% 35% at 40% 80%, oklch(0.70 0.12 280 / 40%) 0%, transparent 70%)',
          ].join(', '),
        }}
      />
      <div className='mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] border border-border/50 bg-background/65 shadow-[0_18px_60px_-45px_rgba(15,23,42,0.45)] backdrop-blur-sm'>
        <div className='grid grid-cols-1 items-center gap-8 px-7 py-12 md:px-12 md:py-16 lg:grid-cols-12 lg:gap-3 lg:px-14 lg:py-16'>
          <div className='flex flex-col items-start text-left lg:col-span-7'>
            <div
              className='landing-animate-fade-up mb-5 inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 px-3 py-1.5 text-[11px] font-medium text-blue-600 opacity-0 shadow-xs dark:border-blue-400/20 dark:bg-blue-400/5 dark:text-blue-400'
              style={{ animationDelay: '0ms' }}
            >
              <span className='relative flex size-1.5'>
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75' />
                <span className='relative inline-flex size-1.5 rounded-full bg-blue-500 dark:bg-blue-400' />
              </span>
              <span>{t('AI Application Infrastructure Foundation')}</span>
            </div>

            <h1
              className='landing-animate-fade-up text-[clamp(2.25rem,4.5vw,3.25rem)] leading-[1.15] font-bold tracking-tight'
              style={{ animationDelay: '60ms' }}
            >
              {t('Enterprise-Level Unified API Gateway')}
              <br />
              <span className='bg-gradient-to-r from-blue-400 via-violet-400 to-purple-500 bg-clip-text text-transparent'>
                {t('Service Management Platform')}
              </span>
            </h1>
            <p
              className='landing-animate-fade-up text-foreground/80 mt-5 text-base font-semibold leading-relaxed md:text-lg'
              style={{ animationDelay: '100ms' }}
            >
              {t('Enterprise Model API Integration and Private Deployment')}
            </p>
            <p
              className='landing-animate-fade-up text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed md:text-[15px]'
              style={{ animationDelay: '140ms' }}
            >
              {t(
                'Connect models through one API gateway. Manage API keys, usage, and costs in one place for individual developers and enterprise teams.'
              )}
            </p>

            <div
              className='landing-animate-fade-up mt-7 flex flex-wrap items-center gap-3 opacity-0'
              style={{ animationDelay: '180ms' }}
            >
              {props.isAuthenticated ? (
                <>
                  <Button
                    className='group h-11 rounded-xl px-5 text-sm font-semibold'
                    render={<Link to='/dashboard' />}
                  >
                    {t('Go to Dashboard')}
                    <ArrowRight className='ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
                  </Button>
                  {renderDocsButton()}
                </>
              ) : (
                <>
                  <Button
                    className='group h-11 rounded-xl px-5 text-sm font-semibold'
                    render={<Link to='/sign-up' />}
                  >
                    {t('Get Started')}
                    <ArrowRight className='ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
                  </Button>
                  <Button
                    variant='outline'
                    className='border-border/50 hover:border-border hover:bg-muted/50 h-11 rounded-xl px-5 text-sm font-medium'
                    render={<Link to='/pricing' />}
                  >
                    {t('View Pricing')}
                  </Button>
                  {renderDocsButton()}
                </>
              )}
            </div>
            <p
              className='landing-animate-fade-up text-muted-foreground/60 mt-4 text-xs opacity-0'
              style={{ animationDelay: '220ms' }}
            >
              {t('RMB pricing display · Usage records · Personal and business services')}
            </p>
            <div className='text-muted-foreground mt-7 flex flex-wrap gap-x-7 gap-y-3 text-sm'>
              <div><strong className='text-foreground block text-base'>{t('Unified access')}</strong>{t('Reduce repeated integrations')}</div>
              <div><strong className='text-foreground block text-base'>{t('Clear usage')}</strong>{t('Review usage and costs')}</div>
              <div><strong className='text-foreground block text-base'>{t('Business services')}</strong>{t('Invoices and corporate payment')}</div>
            </div>
          </div>

          <div
            className='landing-animate-fade-up flex w-full justify-center opacity-0 lg:col-span-5'
            style={{ animationDelay: '280ms' }}
          >
            <div className='relative flex aspect-square w-full max-w-[19rem] items-center justify-center md:max-w-[22rem]'>
              <div className='absolute size-[86%] animate-pulse rounded-full border border-blue-400/20 bg-gradient-to-br from-cyan-400/10 via-violet-400/10 to-fuchsia-400/15 shadow-[0_0_80px_rgba(99,102,241,0.12)]' />
              <div className='absolute size-[68%] rounded-full border border-border/60 bg-background/35 shadow-[0_0_0_1.4rem_rgba(255,255,255,0.12)] backdrop-blur-sm' />
              <img
                src={logo || '/logo.png'}
                alt={t('ZhimoAI brand mark')}
                className='relative size-[54%] animate-hero-float rounded-[1.6rem] object-cover shadow-[0_18px_36px_rgba(15,23,42,0.2)]'
              />
            </div>
          </div>
        </div>

        <div className='border-t border-border/50 px-7 py-4 md:px-12 lg:px-14'>
          <div className='flex items-center gap-6'>
            <span className='text-muted-foreground/60 hidden shrink-0 text-[11px] font-semibold tracking-[0.12em] uppercase sm:block'>
              {t('Supported AI models')}
            </span>
            <div className='model-marquee relative min-w-0 flex-1 overflow-hidden'>
              <div className='pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background/90 to-transparent' />
              <div className='pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background/90 to-transparent' />
              <div className='animate-model-marquee flex w-max items-center'>
                {tickerModels.map((model, index) => (
                  <div
                    key={index}
                    aria-hidden={index >= AI_MODELS.length}
                    className='text-muted-foreground/75 flex shrink-0 items-center gap-2.5 px-5 text-sm font-semibold transition-colors hover:text-foreground md:px-7'
                  >
                    {getLobeIcon(model, 24)}
                    <span>{model.split('.')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
