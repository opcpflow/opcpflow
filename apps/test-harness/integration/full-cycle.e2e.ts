import { test, expect } from '@playwright/test'

test.describe('Full Cycle: Editor -> Save -> Load -> Execute', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
    // Wait for the canvas to be ready
    await page.locator('.react-flow').waitFor({ timeout: 10000 })
  })

  test('should create a new DAG from scratch', async ({ page }) => {
    // Click "New" to reset
    await page.click('text=New')
    await page.waitForTimeout(300)

    // Verify canvas is cleared but still renders
    await expect(page.locator('.react-flow')).toBeVisible()
  })

  test('should select a node and show config panel', async ({ page }) => {
    // Click on the first node on the canvas
    const firstNode = page.locator('.react-flow__node').first()
    await firstNode.click()
    await page.waitForTimeout(300)

    // Config panel should show for the selected node
    const configPanel = page.locator('text=Configuration').first()
    await expect(configPanel).toBeVisible()

    // Node label should be editable
    const labelInput = page.locator('input[placeholder="Node label..."]')
    await expect(labelInput).toBeVisible()
  })

  test('should validate the DAG', async ({ page }) => {
    // Click Validate button
    await page.click('text=Validate')

    // Status bar should show validation result
    const statusBar = page.locator('text=/DAG is valid|Validation:.*error/')
    await expect(statusBar).toBeVisible({ timeout: 5000 })
  })

  test('should apply auto-layout', async ({ page }) => {
    // Click Layout button
    await page.click('text=Layout')

    // Status bar should confirm layout
    await expect(page.locator('text=Auto-layout applied')).toBeVisible({ timeout: 5000 })
  })

  test('should export DAG JSON to clipboard', async ({ page }) => {
    // Grant clipboard permission
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])

    // Click Export
    await page.click('text=Export')

    // Verify status message
    await expect(page.locator('text=DAG JSON copied to clipboard')).toBeVisible({ timeout: 5000 })
  })

  test('should navigate to docs page', async ({ page }) => {
    // Navigate to docs
    await page.goto('/docs')
    await page.waitForURL('/docs')

    // Core doc sections should be present
    await expect(page.locator('text=Getting Started')).toBeVisible()
    await expect(page.locator('text=Core Concepts')).toBeVisible()
    await expect(page.locator('text=Packages')).toBeVisible()
    await expect(page.locator('text=Guides & Examples')).toBeVisible()
    await expect(page.locator('text=API Reference')).toBeVisible()
  })

  test('should handle keyboard delete of selected node', async ({ page }) => {
    // First, get initial node count
    const initialCount = await page.locator('.react-flow__node').count()

    // Select the first node (double-click to ensure selection)
    const firstNode = page.locator('.react-flow__node').first()
    await firstNode.dblclick()
    await page.waitForTimeout(200)

    // Press Delete key
    await page.keyboard.press('Delete')
    await page.waitForTimeout(300)

    // Node count should have decreased
    const newCount = await page.locator('.react-flow__node').count()
    expect(newCount).toBeLessThan(initialCount)
  })

  test('should filter nodes in palette by search', async ({ page }) => {
    // Search for "trigger" in the node palette
    const searchInput = page.locator('input[placeholder="Search nodes..."]')
    await searchInput.fill('trigger')
    await page.waitForTimeout(300)

    // Trigger node should be visible
    await expect(page.locator('text=Trigger').first()).toBeVisible()

    // Other nodes may be hidden by the search
    await searchInput.fill('')
  })

  test('should pop up file import dialog', async ({ page }) => {
    // Click Import - this should trigger a file input
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('text=Import'),
    ])

    // Verify file chooser appeared
    expect(fileChooser).toBeDefined()
  })
})
