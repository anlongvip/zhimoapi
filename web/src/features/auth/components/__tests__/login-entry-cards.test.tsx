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
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { LegalConsent } from '../legal-consent'
import { OAuthProviders } from '../oauth-providers'

afterEach(cleanup)

describe('login entry cards', () => {
  it('keeps required consent unchecked until the user explicitly agrees', async () => {
    function Consent() {
      const [checked, setChecked] = useState(false)
      return (
        <LegalConsent
          status={{
            user_agreement_enabled: true,
            privacy_policy_enabled: true,
          }}
          checked={checked}
          onCheckedChange={setChecked}
        />
      )
    }
    render(<Consent />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
    expect(screen.getByText('Required')).toBeVisible()
    expect(screen.getAllByRole('link')).toHaveLength(2)
    await userEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('shows enabled providers in two columns while consent blocks every provider', () => {
    render(
      <OAuthProviders
        status={{
          github_oauth: true,
          telegram_oauth: true,
          oidc_enabled: true,
          oidc_display_name: 'Google',
        }}
        disabled
      />
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    for (const button of buttons) expect(button).toBeDisabled()
    expect(buttons[0].parentElement).toHaveClass('grid-cols-2')
    expect(
      screen.getByRole('button', { name: /Google/ }).querySelector('svg')
    ).not.toBeNull()
  })

  it('lets a single provider fill the available width', () => {
    render(<OAuthProviders status={{ telegram_oauth: true }} />)
    expect(screen.getByRole('button').parentElement).toHaveClass('grid-cols-1')
  })
})
