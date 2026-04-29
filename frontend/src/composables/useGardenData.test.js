import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('useGardenData', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('uses relative upload paths by default', async () => {
    const { useGardenData } = await import('./useGardenData.js')
    const gardenData = useGardenData()

    expect(gardenData.getImageUrl('/uploads/demo.webp')).toBe('/uploads/demo.webp')
  })
})
