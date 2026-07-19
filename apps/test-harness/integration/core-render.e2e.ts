import { test, expect } from '@playwright/test'

test.describe('Core Render', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor')
  })

  test('should load the editor page', async ({ page }) => {
    // Verify the page title is visible
    await expect(page.locator('text=Simple Data Pipeline')).toBeVisible({ timeout: 10000 })

    // Verify core UI elements are rendered
    await expect(page.locator('text=New')).toBeVisible()
    await expect(page.locator('text=Save')).toBeVisible()
    await expect(page.locator('text=Export')).toBeVisible()
    await expect(page.locator('text=Import')).toBeVisible()
    await expect(page.locator('text=Validate')).toBeVisible()
    await expect(page.locator('text=Layout')).toBeVisible()
  })

  test('should render the node palette', async ({ page }) => {
    await page.goto('/editor')

    // Check that the node palette contains expected categories
    const paletteSection = page.locator('text=Configuration').first()
    await expect(paletteSection).toBeVisible()

    // Verify node types appear in the palette (sample)
    await expect(page.locator('text=Trigger').first()).toBeVisible()
    await expect(page.locator('text=Condition').first()).toBeVisible()
  })

  test('should render the canvas with example DAG', async ({ page }) => {
    await page.goto('/editor')

    // The canvas should render a ReactFlow container
    const reactFlow = page.locator('.react-flow')
    await expect(reactFlow).toBeVisible({ timeout: 10000 })

    // Verify nodes are rendered on the canvas
    const nodes = page.locator('.react-flow__node')
    await expect(nodes).not.toHaveCount(0)
  })

  test('should render the landing page', async ({ page }) => {
    await page.goto('/')

    // Verify hero section
    await expect(page.locator('text=Open DAG Workflow Framework')).toBeVisible()

    // Verify CTA buttons
    await expect(page.locator('text=Try Online Editor')).toBeVisible()
    await expect(page.locator('text=View on GitHub')).toBeVisible()

    // Verify feature cards
    await expect(page.locator('text=Visual DAG Editor')).toBeVisible()
    await expect(page.locator('text=Built-in Execution Engine')).toBeVisible()
    await expect(page.locator('text=Nodes for AI')).toBeVisible()
    await expect(page.locator('text=Extensible Plugin System')).toBeVisible()
  })

  test('should show status bar with node/edge counts', async ({ page }) => {
    await page.goto('/editor')

    // Status bar should show node and edge counts
    const statusBar = page.locator('text=nodes | edges')
    await expect(statusBar).toBeVisible()

    // Should show the pre-populated DAG counts (7 nodes, 7 edges from simple-pipeline)
    const statusArea = page.locator('text=/\\d+ nodes \\| \\d+ edges/')
    await expect(statusArea).toBeVisible()
  })

  test('should navigate between pages', async ({ page }) => {
    // Home page
    await page.goto('/')
    await expect(page.locator('text=Open DAG Workflow Framework')).toBeVisible()

    // Navigate to editor
    await page.click('text=Editor')
    await page.waitForURL('/editor')
    await expect(page.locator('text=Simple Data Pipeline')).toBeVisible()

    // Navigate to docs
    await page.click('text=Docs')
    await page.waitForURL('/docs')
    await expect(page.locator('text=Documentation')).toBeVisible()
  })
})
