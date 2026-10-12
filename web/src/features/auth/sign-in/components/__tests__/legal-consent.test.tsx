import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { afterEach, expect, it, vi } from 'vitest'

import { ThemeProvider } from '@/context/theme-provider'
import { STATUS_QUERY_KEY } from '@/lib/status-query'

import { UserAuthForm } from '../user-auth-form'

let client: QueryClient
afterEach(() => {
  cleanup()
  client?.clear()
  localStorage.clear()
  vi.restoreAllMocks()
})

it('shows a warning and sends no login request when valid credentials are submitted without consent', async () => {
  const warning = vi.spyOn(toast, 'error')
  const request = vi.spyOn(globalThis, 'fetch')
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(STATUS_QUERY_KEY, {
    password_login_enabled: true,
    user_agreement_enabled: true,
  })
  const root = createRootRoute({ component: Outlet })
  const route = createRoute({
    getParentRoute: () => root,
    path: '/sign-in',
    component: UserAuthForm,
  })
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ['/sign-in'] }),
  })
  render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )
  const submit = await screen.findByRole('button', { name: 'Sign in' })
  expect(submit).toBeEnabled()
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  expect(screen.getByText('Required')).toBeVisible()
  await userEvent.type(
    screen.getByRole('textbox', { name: 'Username or Email' }),
    'existing-user'
  )
  await userEvent.type(
    screen.getByLabelText('Password', { exact: true }),
    'valid-password'
  )
  request.mockClear()
  await userEvent.click(submit)
  expect(warning).toHaveBeenCalledWith('Please agree to the legal terms first')
  expect(request).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('checkbox'))
  expect(screen.queryByText('Required')).not.toBeInTheDocument()
})
