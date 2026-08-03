import { expect, test } from '@playwright/test'
import { instant } from '@next/playwright'

test('the reusable shell is visible before dynamic product data', async ({
  page,
}) => {
  await page.goto('/')

  await instant(page, async () => {
    await page.getByRole('link', { name: 'Baseball cap' }).click()
    await expect(page).toHaveURL('/products/hats')
    await expect(
      page.getByRole('heading', { name: 'Product details' }),
    ).toBeVisible()
    await expect(page.getByText('Checking inventory...')).toBeVisible()
  })

  await expect(page.getByRole('heading', { name: 'Baseball cap' })).toBeVisible()
  await expect(page.getByText('12 caps in stock')).toBeVisible()
})
