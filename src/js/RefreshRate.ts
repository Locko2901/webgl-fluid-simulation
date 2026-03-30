const COMMON_REFRESH_RATES = [60, 75, 90, 120, 144, 165, 240]

export function detectRefreshRate(): Promise<number> {
  return new Promise((resolve) => {
    let lastTime = performance.now()
    let frameCount = 0
    const frames: number[] = []

    const measure = (time: number) => {
      const delta = time - lastTime
      lastTime = time
      if (frameCount > 0) frames.push(1000 / delta)
      frameCount++

      if (frameCount < 20) {
        requestAnimationFrame(measure)
      } else {
        const avg = frames.reduce((a, b) => a + b, 0) / frames.length
        const closest = COMMON_REFRESH_RATES.reduce((prev, curr) =>
          Math.abs(curr - avg) < Math.abs(prev - avg) ? curr : prev
        )
        resolve(closest)
      }
    }
    requestAnimationFrame(measure)
  })
}
