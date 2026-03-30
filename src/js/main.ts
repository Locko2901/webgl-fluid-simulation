
import { FluidSimulation } from './FluidSimulation'
import { InputHandler, KeyboardHandler } from './input'
import { GUI } from './gui'
import { SimulationRunner } from './SimulationRunner'
import { initConfig } from './Config'

initConfig()

const canvas = document.getElementById('canvas') as HTMLCanvasElement
if (!canvas) {
  throw new Error('Canvas element not found')
}

const simulation = new FluidSimulation(canvas)
const gui = new GUI(simulation)
const inputHandler = new InputHandler(canvas, simulation)
new KeyboardHandler(simulation, gui, canvas)

const fpsDisplay = document.getElementById('fps')

const runner = new SimulationRunner({
  simulation,
  inputHandler,
  onFrame: (fps) => {
    if (fpsDisplay) {
      fpsDisplay.textContent = `${fps} FPS`
    }
  },
})

runner.start()
