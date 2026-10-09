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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import { ThemeProvider } from '@/context/theme-provider'
import { STATUS_QUERY_KEY } from '@/lib/status-query'

import { SignUp } from '../..'

let client: QueryClient
function renderRegistration() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(STATUS_QUERY_KEY, {
    turnstile_check: true,
    turnstile_site_key: 'test-site',
    user_agreement_enabled: true,
    privacy_policy_enabled: true,
    telegram_oauth: true,
    email_verification: true,
  })
  const root = createRootRoute({ component: Outlet })
  const route = createRoute({
    getParentRoute: () => root,
    path: '/sign-up',
    component: SignUp,
  })
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ['/sign-up'] }),
  })
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider defaultTheme='dark'>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  cleanup()
  client?.clear()
  localStorage.clear()
  delete window.turnstile
  document.querySelector('#cf-turnstile')?.remove()
  vi.restoreAllMocks()
})

it('keeps the registration action disabled until consent and a valid CAPTCHA token are both present, including expiry', async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  const renderWidget = vi.fn(
    (_host: HTMLElement, _options: Record<string, unknown>) =>
      'registration-widget'
  )
  window.turnstile = { render: renderWidget, remove: vi.fn() }
  renderRegistration()
  const submit = await screen.findByRole('button', { name: 'Create account' })
  const consent = screen.getByRole('checkbox')
  expect(consent).not.toBeChecked()
  expect(submit).toBeDisabled()
  const provider = screen.getByRole('button', { name: /Telegram/ })
  expect(provider).toBeDisabled()
  expect(
    submit.compareDocumentPosition(provider) & Node.DOCUMENT_POSITION_FOLLOWING
  ).toBeTruthy()
  expect(screen.queryByText(/By creating an account/)).not.toBeInTheDocument()
  await waitFor(() => expect(renderWidget).toHaveBeenCalled())
  const widgetCall = renderWidget.mock.calls.at(-1)
  if (!widgetCall) throw new Error('Registration CAPTCHA did not render')
  const [host, options] = widgetCall
  expect(options).toEqual(
    expect.objectContaining({ size: 'flexible', theme: 'dark' })
  )
  expect(host.parentElement).toHaveClass('rounded-[1rem]', 'overflow-hidden')
  await userEvent.click(consent)
  expect(submit).toBeDisabled()
  expect(provider).toBeEnabled()
  await act(async () => {
    ;(options.callback as (token: string) => void)('valid-test-token')
  })
  expect(submit).toBeEnabled()
  await act(async () => {
    ;(options['expired-callback'] as () => void)()
  })
  expect(submit).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Send code' })).toBeDisabled()
})
