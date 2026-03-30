import type { RGB } from './types'

export interface DeltaResult {
  dx: number
  dy: number
  startX: number
  startY: number
  endX: number
  endY: number
}

export class Pointer {
  id: number = -1
  texcoordX: number = 0
  texcoordY: number = 0
  prevTexcoordX: number = 0
  prevTexcoordY: number = 0
  deltaX: number = 0
  deltaY: number = 0
  accumulatedDeltaX: number = 0
  accumulatedDeltaY: number = 0
  startTexcoordX: number = 0
  startTexcoordY: number = 0
  down: boolean = false
  moved: boolean = false
  color: RGB = { r: 0, g: 0, b: 0 }
  private readonly _deltaResult: DeltaResult = { dx: 0, dy: 0, startX: 0, startY: 0, endX: 0, endY: 0 }

  updateDownData(posX: number, posY: number, canvasWidth: number, canvasHeight: number): void {
    this.texcoordX = posX / canvasWidth
    this.texcoordY = 1.0 - posY / canvasHeight
    this.prevTexcoordX = this.texcoordX
    this.prevTexcoordY = this.texcoordY
    this.startTexcoordX = this.texcoordX
    this.startTexcoordY = this.texcoordY
    this.deltaX = 0
    this.deltaY = 0
    this.accumulatedDeltaX = 0
    this.accumulatedDeltaY = 0
  }

  updateMoveData(posX: number, posY: number, canvasWidth: number, canvasHeight: number): void {
    this.prevTexcoordX = this.texcoordX
    this.prevTexcoordY = this.texcoordY

    if (!this.moved) {
      this.startTexcoordX = this.texcoordX
      this.startTexcoordY = this.texcoordY
    }

    this.texcoordX = posX / canvasWidth
    this.texcoordY = 1.0 - posY / canvasHeight

    const aspectRatio = canvasWidth / canvasHeight
    let dx = this.texcoordX - this.prevTexcoordX
    let dy = this.texcoordY - this.prevTexcoordY

    if (aspectRatio > 1) dx *= aspectRatio
    if (aspectRatio < 1) dy *= (1 / aspectRatio)

    this.deltaX = dx
    this.deltaY = dy
    this.accumulatedDeltaX += dx
    this.accumulatedDeltaY += dy
    this.moved = true
  }

  consumeAccumulatedDelta(): DeltaResult {
    this._deltaResult.dx = this.accumulatedDeltaX
    this._deltaResult.dy = this.accumulatedDeltaY
    this._deltaResult.startX = this.startTexcoordX
    this._deltaResult.startY = this.startTexcoordY
    this._deltaResult.endX = this.texcoordX
    this._deltaResult.endY = this.texcoordY

    this.accumulatedDeltaX = 0
    this.accumulatedDeltaY = 0
    this.startTexcoordX = this.texcoordX
    this.startTexcoordY = this.texcoordY
    this.moved = false

    return this._deltaResult
  }
}
