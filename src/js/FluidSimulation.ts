import { WebGLContext } from './WebGLContext'
import * as shaders from './shaders/index'
import { config } from './Config'
import { generateColor } from './Color'
import type { RGB, Resolution, SplatData, Programs, Framebuffers, FBO, DoubleFBO, ShaderProgram } from './types'

interface BloomFramebuffers {
  prefilter: FBO;
  blur: DoubleFBO[];
}

const VELOCITY_TO_SIM_SCALE = 1.0 / 1000.0

const BLOOM_ITERATIONS = 5

export class FluidSimulation {
  canvas: HTMLCanvasElement
  webgl: WebGLContext
  gl: WebGLRenderingContext
  programs!: Programs
  framebuffers!: Framebuffers
  bloomFramebuffers!: BloomFramebuffers
  bloomPrograms!: { prefilter: ShaderProgram; blur: ShaderProgram; final: ShaderProgram }
  displayBloomProgram!: ShaderProgram
  splatStack: SplatData[][] = []

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.webgl = new WebGLContext(canvas)
    this.gl = this.webgl.gl

    this.initPrograms()
    this.initFramebuffers()
  }

  initPrograms(): void {
    const { webgl } = this

    this.programs = {
      clear: webgl.createProgram(shaders.baseVertexShader, shaders.clearShader),
      display: webgl.createProgram(shaders.baseVertexShader, shaders.displayShader),
      splat: webgl.createProgram(shaders.baseVertexShader, shaders.splatShader),
      advection: webgl.createProgram(shaders.baseVertexShader, shaders.advectionShader),
      divergence: webgl.createProgram(shaders.baseVertexShader, shaders.divergenceShader),
      curl: webgl.createProgram(shaders.baseVertexShader, shaders.curlShader),
      vorticity: webgl.createProgram(shaders.baseVertexShader, shaders.vorticityShader),
      pressure: webgl.createProgram(shaders.baseVertexShader, shaders.pressureShader),
      gradientSubtract: webgl.createProgram(shaders.baseVertexShader, shaders.gradientSubtractShader),
    }

    this.bloomPrograms = {
      prefilter: webgl.createProgram(shaders.baseVertexShader, shaders.bloomPrefilterShader),
      blur: webgl.createProgram(shaders.baseVertexShader, shaders.bloomBlurShader),
      final: webgl.createProgram(shaders.baseVertexShader, shaders.bloomFinalShader),
    }

    this.displayBloomProgram = webgl.createProgram(
      shaders.baseVertexShader,
      shaders.displayBloomShader
    )
  }

  initFramebuffers(): void {
    const { gl, webgl } = this

    const simRes = this.getResolution(config.SIM_RESOLUTION)
    const dyeRes = this.getResolution(config.DYE_RESOLUTION)
    const bloomRes = this.getResolution(256)

    const texType = webgl.extHalfFloat
      ? webgl.extHalfFloat.HALF_FLOAT_OES
      : gl.UNSIGNED_BYTE

    const rgba = webgl.getSupportedFormat(gl.RGBA, gl.RGBA, texType) || {
      internalFormat: gl.RGBA,
      format: gl.RGBA,
      type: gl.UNSIGNED_BYTE,
    }

    const filtering = webgl.extHalfFloatLinear || webgl.extFloatLinear
      ? gl.LINEAR
      : gl.NEAREST

    this.framebuffers = {
      dye: webgl.createDoubleFBO(
        dyeRes.width,
        dyeRes.height,
        rgba.internalFormat,
        rgba.format,
        rgba.type,
        filtering
      ),
      velocity: webgl.createDoubleFBO(
        simRes.width,
        simRes.height,
        rgba.internalFormat,
        rgba.format,
        rgba.type,
        filtering
      ),
      divergence: webgl.createFBO(
        simRes.width,
        simRes.height,
        rgba.internalFormat,
        rgba.format,
        rgba.type,
        gl.NEAREST
      ),
      curl: webgl.createFBO(
        simRes.width,
        simRes.height,
        rgba.internalFormat,
        rgba.format,
        rgba.type,
        gl.NEAREST
      ),
      pressure: webgl.createDoubleFBO(
        simRes.width,
        simRes.height,
        rgba.internalFormat,
        rgba.format,
        rgba.type,
        gl.NEAREST
      ),
    }

    this.bloomFramebuffers = {
      prefilter: webgl.createFBO(
        bloomRes.width,
        bloomRes.height,
        rgba.internalFormat,
        rgba.format,
        rgba.type,
        filtering
      ),
      blur: [],
    }

    let w = bloomRes.width
    let h = bloomRes.height
    for (let i = 0; i < BLOOM_ITERATIONS; i++) {
      w = Math.floor(w / 2)
      h = Math.floor(h / 2)
      if (w < 2 || h < 2) break
      this.bloomFramebuffers.blur.push(
        webgl.createDoubleFBO(w, h, rgba.internalFormat, rgba.format, rgba.type, filtering)
      )
    }
  }

  getResolution(resolution: number): Resolution {
    const { gl } = this
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio

    const min = Math.round(resolution)
    const max = Math.round(resolution * aspectRatio)

    if (gl.drawingBufferWidth > gl.drawingBufferHeight) {
      return { width: max, height: min }
    }
    return { width: min, height: max }
  }

  resize(): void {
    const width = window.innerWidth
    const height = window.innerHeight

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
      this.initFramebuffers()
    }
  }

  splat(x: number, y: number, dx: number, dy: number, color: RGB): void {
    const { gl, webgl, programs, framebuffers, canvas } = this
    const { splat: splatProgram } = programs
    const { velocity, dye } = framebuffers

    const scaledDx = dx * VELOCITY_TO_SIM_SCALE
    const scaledDy = dy * VELOCITY_TO_SIM_SCALE

    gl.useProgram(splatProgram.program)
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0))
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height)
    gl.uniform2f(splatProgram.uniforms.point, x, y)
    gl.uniform3f(splatProgram.uniforms.color, scaledDx, scaledDy, 0.0)
    gl.uniform1f(splatProgram.uniforms.radius, this.correctRadius(config.SPLAT_RADIUS / 100.0))
    webgl.blit(velocity.write)
    velocity.swap()

    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0))
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b)
    webgl.blit(dye.write)
    dye.swap()
  }

  correctRadius(radius: number): number {
    const aspectRatio = this.canvas.width / this.canvas.height
    if (aspectRatio > 1) radius *= aspectRatio
    return radius
  }

  addSplats(amount: number): void {
    const splats: SplatData[] = []
    for (let i = 0; i < amount; i++) {
      const color = generateColor()
      const x = Math.random()
      const y = Math.random()
      const force = config.AUTO_SPLAT_FORCE
      const dx = force * 2 * (Math.random() - 0.5)
      const dy = force * 2 * (Math.random() - 0.5)
      splats.push({ x, y, dx, dy, color })
    }
    this.splatStack.push(splats)
  }

  step(dt: number): void {
    const { gl, webgl, programs, framebuffers } = this
    const { velocity, dye, divergence, curl, pressure } = framebuffers

    gl.disable(gl.BLEND)
    webgl.prepareRender()

    gl.useProgram(programs.curl.program)
    gl.uniform2f(programs.curl.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
    gl.uniform1i(programs.curl.uniforms.uVelocity, velocity.read.attach(0))
    webgl.blit(curl)

    gl.useProgram(programs.vorticity.program)
    gl.uniform2f(programs.vorticity.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
    gl.uniform1i(programs.vorticity.uniforms.uVelocity, velocity.read.attach(0))
    gl.uniform1i(programs.vorticity.uniforms.uCurl, curl.attach(1))
    gl.uniform1f(programs.vorticity.uniforms.curl, config.CURL)
    gl.uniform1f(programs.vorticity.uniforms.dt, dt)
    gl.uniform1f(programs.vorticity.uniforms.damping, config.VELOCITY_DAMPING)
    webgl.blit(velocity.write)
    velocity.swap()

    gl.useProgram(programs.divergence.program)
    gl.uniform2f(programs.divergence.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
    gl.uniform1i(programs.divergence.uniforms.uVelocity, velocity.read.attach(0))
    webgl.blit(divergence)

    gl.useProgram(programs.clear.program)
    gl.uniform1i(programs.clear.uniforms.uTexture, pressure.read.attach(0))
    gl.uniform1f(programs.clear.uniforms.value, 0.8)
    webgl.blit(pressure.write)
    pressure.swap()

    gl.useProgram(programs.pressure.program)
    gl.uniform2f(programs.pressure.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
    gl.uniform1i(programs.pressure.uniforms.uDivergence, divergence.attach(0))

    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(programs.pressure.uniforms.uPressure, pressure.read.attach(1))
      webgl.blit(pressure.write)
      pressure.swap()
    }

    gl.useProgram(programs.gradientSubtract.program)
    gl.uniform2f(programs.gradientSubtract.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
    gl.uniform1i(programs.gradientSubtract.uniforms.uPressure, pressure.read.attach(0))
    gl.uniform1i(programs.gradientSubtract.uniforms.uVelocity, velocity.read.attach(1))
    webgl.blit(velocity.write)
    velocity.swap()

    gl.useProgram(programs.advection.program)
    gl.uniform2f(programs.advection.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY)
    gl.uniform1i(programs.advection.uniforms.uVelocity, velocity.read.attach(0))
    gl.uniform1i(programs.advection.uniforms.uSource, velocity.read.attach(0))
    gl.uniform1f(programs.advection.uniforms.dt, dt)
    gl.uniform1f(programs.advection.uniforms.dissipation, config.VELOCITY_DISSIPATION)
    webgl.blit(velocity.write)
    velocity.swap()

    gl.uniform2f(programs.advection.uniforms.texelSize, dye.texelSizeX, dye.texelSizeY)
    gl.uniform1i(programs.advection.uniforms.uVelocity, velocity.read.attach(0))
    gl.uniform1i(programs.advection.uniforms.uSource, dye.read.attach(1))
    gl.uniform1f(programs.advection.uniforms.dissipation, config.DENSITY_DISSIPATION)
    webgl.blit(dye.write)
    dye.swap()
  }

  render(): void {
    const { gl, webgl, programs, framebuffers } = this
    const hasBloom = config.BLOOM && this.bloomFramebuffers.blur.length > 0

    webgl.prepareRender()

    if (!hasBloom) {
      gl.useProgram(programs.display.program)
      gl.uniform1i(programs.display.uniforms.uTexture, framebuffers.dye.read.attach(0))
      webgl.blit(null)
      return
    }

    this.applyBloom(framebuffers.dye.read)
    const bloomTexture = this.bloomFramebuffers.blur[this.bloomFramebuffers.blur.length - 1].read

    gl.useProgram(this.displayBloomProgram.program)
    gl.uniform1i(this.displayBloomProgram.uniforms.uTexture, framebuffers.dye.read.attach(0))
    gl.uniform1i(this.displayBloomProgram.uniforms.uBloom, bloomTexture.attach(1))
    gl.uniform1f(this.displayBloomProgram.uniforms.bloomIntensity, config.BLOOM_INTENSITY)
    webgl.blit(null)
  }

  applyBloom(source: FBO): void {
    const { gl, webgl, bloomPrograms, bloomFramebuffers } = this
    const blurs = bloomFramebuffers.blur
    if (blurs.length === 0) return

    const threshold = Math.max(config.BLOOM_THRESHOLD, 0.001)
    const knee = Math.max(threshold * 0.7, 0.0001) // Prevent division by zero
    gl.useProgram(bloomPrograms.prefilter.program)
    gl.uniform3f(bloomPrograms.prefilter.uniforms.curve, threshold - knee, knee * 2, 0.25 / knee)
    gl.uniform1f(bloomPrograms.prefilter.uniforms.threshold, config.BLOOM_THRESHOLD)
    gl.uniform1i(bloomPrograms.prefilter.uniforms.uTexture, source.attach(0))
    webgl.blit(bloomFramebuffers.prefilter)

    gl.useProgram(bloomPrograms.blur.program)

    let prevTexture: FBO = bloomFramebuffers.prefilter
    for (let i = 0; i < blurs.length; i++) {
      const target = blurs[i]

      gl.uniform2f(bloomPrograms.blur.uniforms.texelSize, 1 / prevTexture.width, 1 / prevTexture.height)
      gl.uniform2f(bloomPrograms.blur.uniforms.direction, 1, 0)
      gl.uniform1i(bloomPrograms.blur.uniforms.uTexture, prevTexture.attach(0))
      webgl.blit(target.write)
      target.swap()

      gl.uniform2f(bloomPrograms.blur.uniforms.texelSize, 1 / target.width, 1 / target.height)
      gl.uniform2f(bloomPrograms.blur.uniforms.direction, 0, 1)
      gl.uniform1i(bloomPrograms.blur.uniforms.uTexture, target.read.attach(0))
      webgl.blit(target.write)
      target.swap()

      prevTexture = target.read
    }
  }

  processSplatStack(): void {
    if (this.splatStack.length > 0) {
      const splats = this.splatStack.pop()
      if (splats) {
        for (const s of splats) {
          this.splat(s.x, s.y, s.dx, s.dy, s.color)
        }
      }
    }
  }

  clearFramebuffers(): void {
    const { gl, framebuffers } = this

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.velocity.read.fbo)
    gl.viewport(0, 0, framebuffers.velocity.width, framebuffers.velocity.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.velocity.write.fbo)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.dye.read.fbo)
    gl.viewport(0, 0, framebuffers.dye.width, framebuffers.dye.height)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.dye.write.fbo)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.pressure.read.fbo)
    gl.viewport(0, 0, framebuffers.pressure.width, framebuffers.pressure.height)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.pressure.write.fbo)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.divergence.fbo)
    gl.viewport(0, 0, framebuffers.divergence.width, framebuffers.divergence.height)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.curl.fbo)
    gl.viewport(0, 0, framebuffers.curl.width, framebuffers.curl.height)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    this.splatStack = []
  }

  reset(): void {
    this.clearFramebuffers()
    this.addSplats(Math.floor(Math.random() * 10) + 5)
  }

  dispose(): void {
    const { gl } = this

    const allPrograms = [
      ...Object.values(this.programs),
      ...Object.values(this.bloomPrograms),
      this.displayBloomProgram
    ]
    for (const prog of allPrograms) {
      gl.deleteProgram(prog.program)
    }

    const deleteFBO = (fbo: FBO) => {
      gl.deleteTexture(fbo.texture)
      gl.deleteFramebuffer(fbo.fbo)
    }

    const deleteDoubleFBO = (dfbo: DoubleFBO) => {
      deleteFBO(dfbo.read)
      deleteFBO(dfbo.write)
    }

    deleteDoubleFBO(this.framebuffers.dye)
    deleteDoubleFBO(this.framebuffers.velocity)
    deleteDoubleFBO(this.framebuffers.pressure)
    deleteFBO(this.framebuffers.divergence)
    deleteFBO(this.framebuffers.curl)

    deleteFBO(this.bloomFramebuffers.prefilter)
    for (const blur of this.bloomFramebuffers.blur) {
      deleteDoubleFBO(blur)
    }

    this.webgl.dispose()
  }
}
