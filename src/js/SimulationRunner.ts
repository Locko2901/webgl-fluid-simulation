import { FluidSimulation } from './FluidSimulation'
import { InputHandler } from './input'
import { config } from './Config'
import { generateColor, updateRGBCycle } from './Color'
import { detectRefreshRate } from './RefreshRate'

export interface SimulationRunnerOptions {
  simulation: FluidSimulation
  inputHandler?: InputHandler | null
  onFrame?: (fps: number) => void
}

export class SimulationRunner {
  private simulation: FluidSimulation
  private inputHandler: InputHandler | null

  private running = false
  private tabVisible = true
  private frameCount = 0
  private lastFpsUpdate = Date.now()
  private lastTime = Date.now()
  private lastFrameTime = Date.now()
  private accumulator = 0
  private monitorRefreshRate = 60
  private animationId: number | null = null
  private autoSplatInterval: ReturnType<typeof setInterval> | null = null
  private onFrame?: (fps: number) => void
  private messageChannel: MessageChannel | null = null
  private pendingMessage = false
  private boundVisibilityHandler: () => void

  private static readonly FIXED_DT = 1.0 / 60.0
  private static readonly MAX_FRAME_TIME = 0.1
  private static readonly AUTO_SPLAT_INTERVAL = 2000
  private static readonly AUTO_SPLAT_CHANCE = 0.3
  private static readonly FPS_UPDATE_INTERVAL = 500
  private static readonly DEFAULT_REFRESH_RATE = 60

  private static readonly TURBULENCE_PROBABILITY_FACTOR = 0.3
  private static readonly TURBULENCE_FORCE_MULTIPLIER = 200
  private static readonly TURBULENCE_COLOR_FACTOR = 0.3

  private static readonly MARBLING_PROBABILITY = 0.1
  private static readonly MARBLING_MAX_SWIRLS = 3
  private static readonly MARBLING_BASE_FORCE = 150
  private static readonly MARBLING_FORCE_VARIANCE = 100

  private refreshRateReady = false
  private pendingStart = false

  constructor(options: SimulationRunnerOptions) {
    this.simulation = options.simulation
    this.inputHandler = options.inputHandler ?? null
    this.onFrame = options.onFrame
    this.boundVisibilityHandler = this.handleVisibilityChange.bind(this)
    document.addEventListener('visibilitychange', this.boundVisibilityHandler)
    this.initRefreshRate()
  }

  private handleVisibilityChange(): void {
    this.tabVisible = !document.hidden
    if (this.tabVisible && this.running) {
      this.lastTime = Date.now()
      this.lastFrameTime = Date.now()
      this.accumulator = 0
    }
  }

  private initRefreshRate(): void {
    detectRefreshRate()
      .then((rate) => this.onRefreshRateDetected(rate))
      .catch(() => this.onRefreshRateDetected(SimulationRunner.DEFAULT_REFRESH_RATE))
  }

  private onRefreshRateDetected(rate: number): void {
    this.monitorRefreshRate = rate
    this.refreshRateReady = true
    if (this.pendingStart) {
      this.pendingStart = false
      this.startInternal()
    }
  }

  start(): void {
    if (this.running) return
    if (!this.refreshRateReady) {
      this.pendingStart = true
      return
    }
    this.startInternal()
  }

  private startInternal(): void {
    this.running = true
    this.lastTime = Date.now()
    this.lastFrameTime = Date.now()
    this.lastFpsUpdate = Date.now()
    this.frameCount = 0
    this.accumulator = 0

    this.simulation.addSplats(Math.floor(Math.random() * 10) + 5)

    this.autoSplatInterval = setInterval(() => {
      if (this.tabVisible && config.AUTO_SPLATS && !config.PAUSED && Math.random() < SimulationRunner.AUTO_SPLAT_CHANCE) {
        this.simulation.addSplats(Math.floor(Math.random() * 3) + 1)
      }
    }, SimulationRunner.AUTO_SPLAT_INTERVAL)

    this.scheduleNextFrame()
  }

  stop(): void {
    this.running = false
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    if (this.autoSplatInterval !== null) {
      clearInterval(this.autoSplatInterval)
      this.autoSplatInterval = null
    }
    if (this.messageChannel !== null) {
      this.messageChannel.port1.close()
      this.messageChannel.port2.close()
      this.messageChannel = null
      this.pendingMessage = false
    }
    document.removeEventListener('visibilitychange', this.boundVisibilityHandler)
  }

  isRunning(): boolean {
    return this.running
  }

  private scheduleNextFrame(): void {
    if (!this.running) return

    const isHighFpsMode = config.TARGET_FPS === 0 || config.TARGET_FPS > this.monitorRefreshRate

    this.inputHandler?.setImmediateMode(isHighFpsMode)

    if (isHighFpsMode) {
      if (!this.messageChannel) {
        this.messageChannel = new MessageChannel()
        this.messageChannel.port1.onmessage = () => {
          this.pendingMessage = false
          this.update()
        }
      }
      if (!this.pendingMessage) {
        this.pendingMessage = true
        this.messageChannel.port2.postMessage(null)
      }
    } else {
      if (this.messageChannel !== null) {
        this.messageChannel.port1.close()
        this.messageChannel.port2.close()
        this.messageChannel = null
        this.pendingMessage = false
      }
      this.animationId = requestAnimationFrame(() => this.update())
    }
  }

  private update(): void {
    if (!this.running) return

    if (!this.tabVisible) {
      this.scheduleNextFrame()
      return
    }

    const now = Date.now()


    if (config.TARGET_FPS > 0 && config.TARGET_FPS < this.monitorRefreshRate) {
      const targetFrameTime = 1000 / config.TARGET_FPS
      const elapsed = now - this.lastFrameTime
      if (elapsed < targetFrameTime) {
        this.scheduleNextFrame()
        return
      }
      this.lastFrameTime = now - (elapsed % targetFrameTime)
    } else {
      this.lastFrameTime = now
    }

    this.simulation.resize()

    const frameTime = Math.min((now - this.lastTime) / 1000, SimulationRunner.MAX_FRAME_TIME)
    this.lastTime = now
    this.accumulator += frameTime

    if (!config.PAUSED) {
      updateRGBCycle(frameTime)
      this.simulation.processSplatStack()
      this.inputHandler?.update()
      this.applyTurbulence()
      this.applyMarbling()

      while (this.accumulator >= SimulationRunner.FIXED_DT) {
        this.simulation.step(SimulationRunner.FIXED_DT)
        this.accumulator -= SimulationRunner.FIXED_DT
      }
    } else {
      this.accumulator = 0
    }

    this.simulation.render()
    this.updateFpsCounter(now)
    this.scheduleNextFrame()
  }

  private updateFpsCounter(now: number): void {
    this.frameCount++
    const elapsed = now - this.lastFpsUpdate
    if (elapsed >= SimulationRunner.FPS_UPDATE_INTERVAL) {
      const fps = Math.round(this.frameCount * 1000 / elapsed)
      this.onFrame?.(fps)
      this.frameCount = 0
      this.lastFpsUpdate = now
    }
  }

  private applyTurbulence(): void {
    if (config.TURBULENCE <= 0 || Math.random() >= config.TURBULENCE * SimulationRunner.TURBULENCE_PROBABILITY_FACTOR) return

    const x = Math.random()
    const y = Math.random()
    const angle = Math.random() * Math.PI * 2
    const force = SimulationRunner.TURBULENCE_FORCE_MULTIPLIER * config.TURBULENCE

    const color = generateColor()
    color.r *= SimulationRunner.TURBULENCE_COLOR_FACTOR
    color.g *= SimulationRunner.TURBULENCE_COLOR_FACTOR
    color.b *= SimulationRunner.TURBULENCE_COLOR_FACTOR

    this.simulation.splat(x, y, Math.cos(angle) * force, Math.sin(angle) * force, color)
  }

  private applyMarbling(): void {
    if (!config.MARBLING || Math.random() >= SimulationRunner.MARBLING_PROBABILITY) return

    const intensity = config.MARBLING_INTENSITY
    const numSwirls = Math.floor(Math.random() * SimulationRunner.MARBLING_MAX_SWIRLS) + 1
    for (let i = 0; i < numSwirls; i++) {
      const x = Math.random()
      const y = Math.random()
      const angle = Math.random() * Math.PI * 2
      const force = (SimulationRunner.MARBLING_BASE_FORCE + Math.random() * SimulationRunner.MARBLING_FORCE_VARIANCE) * intensity
      this.simulation.splat(x, y, Math.cos(angle) * force, Math.sin(angle) * force, { r: 0, g: 0, b: 0 })
    }
  }
}
