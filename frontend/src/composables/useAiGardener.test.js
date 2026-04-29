import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('useAiGardener', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('sends chat requests and appends ai replies', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        answer: '建议先观察盆土湿度，再决定是否补水。',
        provider: 'doubao',
        model: 'doubao-1-5-vision-lite-250315',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { useAiGardener } = await import('./useAiGardener.js')
    const gardener = useAiGardener()

    await gardener.sendMessage({
      message: '它今天叶片有点下垂，要不要浇水？',
      plantId: 2,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ai/chat',
      expect.objectContaining({
        method: 'POST',
      }),
    )

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(payload).toMatchObject({
      message: '它今天叶片有点下垂，要不要浇水？',
      plantId: 2,
      imagePaths: [],
    })

    expect(gardener.messages.value.at(-1)).toMatchObject({
      role: 'assistant',
      content: '建议先观察盆土湿度，再决定是否补水。',
      provider: 'doubao',
    })
  })

  it('stores request errors for the ui', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        message: 'Doubao API key is not configured',
      }),
    }))

    const { useAiGardener } = await import('./useAiGardener.js')
    const gardener = useAiGardener()

    await expect(
      gardener.sendMessage({
        message: '你好',
        plantId: null,
      }),
    ).rejects.toThrow('Doubao API key is not configured')

    expect(gardener.error.value).toBe('Doubao API key is not configured')
  })
})
