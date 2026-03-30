import { Pointer } from '../Pointer'
import { generateColor, getRGBCycleColor } from '../Color'
import type { FluidSimulation } from '../FluidSimulation'
import { config } from '../Config'

const MAX_POINTERS = 10

const SPLAT_SPACING = 0.01

export class InputHandler {
  private canvas: HTMLCanvasElement
  private simulation: FluidSimulation
  private pointers: Pointer[] = []
  private immediateMode = false
  private boundHandlers: {
    mouseDown: (e: MouseEvent) => void;
    mouseMove: (e: MouseEvent) => void;
    mouseUp: () => void;
    touchStart: (e: TouchEvent) => void;
    touchMove: (e: TouchEvent) => void;
    touchEnd: (e: TouchEvent) => void;
  }

  constructor(canvas: HTMLCanvasElement, simulation: FluidSimulation) {
    this.canvas = canvas
    this.simulation = simulation

    for (let i = 0; i < MAX_POINTERS; i++) {
      this.pointers.push(new Pointer())
    }

    this.boundHandlers = {
      mouseDown: this.handleMouseDown.bind(this),
      mouseMove: this.handleMouseMove.bind(this),
      mouseUp: this.handleMouseUp.bind(this),
      touchStart: this.handleTouchStart.bind(this),
      touchMove: this.handleTouchMove.bind(this),
      touchEnd: this.handleTouchEnd.bind(this),
    }

    this.attachListeners()
  }

  setImmediateMode(enabled: boolean): void {
    this.immediateMode = enabled
  }

  private attachListeners(): void {
    const { canvas, boundHandlers } = this

    canvas.addEventListener('mousedown', boundHandlers.mouseDown)
    canvas.addEventListener('mousemove', boundHandlers.mouseMove)
    window.addEventListener('mouseup', boundHandlers.mouseUp)

    canvas.addEventListener('touchstart', boundHandlers.touchStart, { passive: false })
    canvas.addEventListener('touchmove', boundHandlers.touchMove, { passive: false })
    window.addEventListener('touchend', boundHandlers.touchEnd)
  }

  dispose(): void {
    const { canvas, boundHandlers } = this

    canvas.removeEventListener('mousedown', boundHandlers.mouseDown)
    canvas.removeEventListener('mousemove', boundHandlers.mouseMove)
    window.removeEventListener('mouseup', boundHandlers.mouseUp)

    canvas.removeEventListener('touchstart', boundHandlers.touchStart)
    canvas.removeEventListener('touchmove', boundHandlers.touchMove)
    window.removeEventListener('touchend', boundHandlers.touchEnd)
  }

  private handleMouseDown(e: MouseEvent): void {
    const pointer = this.pointers[0]
    pointer.down = true
    pointer.color = config.RGB_MODE ? getRGBCycleColor() : generateColor()
    pointer.updateDownData(e.offsetX, e.offsetY, this.canvas.width, this.canvas.height)
  }

  private handleMouseMove(e: MouseEvent): void {
    const pointer = this.pointers[0]
    if (!pointer.down) return
    if (config.RGB_MODE) {
      pointer.color = getRGBCycleColor()
    }
    pointer.updateMoveData(e.offsetX, e.offsetY, this.canvas.width, this.canvas.height)

    if (this.immediateMode) {
      this.processPointerSplat(pointer)
    }
  }

  private handleMouseUp(): void {
    this.pointers[0].down = false
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault()
    const touches = e.targetTouches

    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i]
      const pointer = this.findPointerById(touch.identifier) ?? this.findFreePointer()
      if (!pointer) continue

      pointer.id = touch.identifier
      pointer.down = true
      pointer.color = config.RGB_MODE ? getRGBCycleColor() : generateColor()
      pointer.updateDownData(touch.clientX, touch.clientY, this.canvas.width, this.canvas.height)
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault()
    const touches = e.targetTouches

    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i]
      const pointer = this.findPointerById(touch.identifier)
      if (!pointer?.down) continue
      if (config.RGB_MODE) {
        pointer.color = getRGBCycleColor()
      }
      pointer.updateMoveData(touch.clientX, touch.clientY, this.canvas.width, this.canvas.height)

      if (this.immediateMode) {
        this.processPointerSplat(pointer)
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    const touches = e.changedTouches

    for (let i = 0; i < touches.length; i++) {
      const pointer = this.findPointerById(touches[i].identifier)
      if (pointer) {
        pointer.down = false
        pointer.id = -1
      }
    }
  }

  private findPointerById(id: number): Pointer | undefined {
    return this.pointers.find((p) => p.id === id)
  }

  private findFreePointer(): Pointer | undefined {
    return this.pointers.find((p) => p.id === -1)
  }

  private processPointerSplat(pointer: Pointer): void {
    if (!pointer.moved) return

    const { dx, dy, startX, startY, endX, endY } = pointer.consumeAccumulatedDelta()

    const pathDx = endX - startX
    const pathDy = endY - startY
    const distance = Math.sqrt(pathDx * pathDx + pathDy * pathDy)

    const numSplats = Math.max(1, Math.floor(distance / SPLAT_SPACING))

    const forcePerSplat = config.SPLAT_FORCE / numSplats

    for (let i = 0; i < numSplats; i++) {
      const t = numSplats === 1 ? 1 : i / (numSplats - 1)
      const x = startX + pathDx * t
      const y = startY + pathDy * t

      this.simulation.splat(
        x,
        y,
        dx * forcePerSplat,
        dy * forcePerSplat,
        pointer.color
      )
    }
  }

  update(): void {
    if (this.immediateMode) return

    for (const pointer of this.pointers) {
      this.processPointerSplat(pointer)
    }
  }
}
