import type { FBO, DoubleFBO, ShaderProgram, TextureFormat } from './types'

const GL_CONTEXT_OPTIONS: WebGLContextAttributes = {
  alpha: false,
  preserveDrawingBuffer: true,
  desynchronized: true,
  powerPreference: 'high-performance',
}

export class WebGLContext {
  readonly canvas: HTMLCanvasElement
  readonly gl: WebGLRenderingContext
  readonly extFloat: OES_texture_float | null
  readonly extHalfFloat: OES_texture_half_float | null
  readonly extFloatLinear: OES_texture_float_linear | null
  readonly extHalfFloatLinear: OES_texture_half_float_linear | null
  readonly extColorBufferHalfFloat: EXT_color_buffer_half_float | null
  private vertexBuffer: WebGLBuffer | null = null
  private indexBuffer: WebGLBuffer | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas

    const gl = canvas.getContext('webgl', GL_CONTEXT_OPTIONS)
    if (!gl) {
      throw new Error('WebGL not supported. Please use a modern browser.')
    }
    this.gl = gl

    this.extFloat = gl.getExtension('OES_texture_float')
    this.extHalfFloat = gl.getExtension('OES_texture_half_float')
    this.extFloatLinear = gl.getExtension('OES_texture_float_linear')
    this.extHalfFloatLinear = gl.getExtension('OES_texture_half_float_linear')
    this.extColorBufferHalfFloat = gl.getExtension('EXT_color_buffer_half_float')

    this.initGeometry()
  }

  private initGeometry(): void {
    const { gl } = this

    this.vertexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW)

    this.indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW)
  }

  compileShader(type: number, source: string): WebGLShader {
    const { gl } = this

    const shader = gl.createShader(type)
    if (!shader) {
      throw new Error(`Failed to create ${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader`)
    }

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error(`Shader compilation failed: ${info}`)
    }

    return shader
  }

  createProgram(vertexSource: string, fragmentSource: string): ShaderProgram {
    const { gl } = this

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource)
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource)

    const program = gl.createProgram()
    if (!program) {
      throw new Error('Failed to create WebGL program')
    }

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program)
      gl.deleteProgram(program)
      throw new Error(`Program linking failed: ${info}`)
    }

    const uniforms: Record<string, WebGLUniformLocation | null> = {}
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
    for (let i = 0; i < uniformCount; i++) {
      const uniformInfo = gl.getActiveUniform(program, i)
      if (uniformInfo) {
        uniforms[uniformInfo.name] = gl.getUniformLocation(program, uniformInfo.name)
      }
    }

    return { program, uniforms }
  }

  createFBO(
    width: number,
    height: number,
    internalFormat: number,
    format: number,
    type: number,
    filter: number
  ): FBO {
    const { gl } = this

    gl.activeTexture(gl.TEXTURE0)

    const texture = gl.createTexture()
    if (!texture) {
      throw new Error('Failed to create texture')
    }

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, type, null)

    const fbo = gl.createFramebuffer()
    if (!fbo) {
      throw new Error('Failed to create framebuffer')
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    gl.viewport(0, 0, width, height)
    gl.clear(gl.COLOR_BUFFER_BIT)

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    return {
      texture,
      fbo,
      width,
      height,
      attach(id: number): number {
        self.gl.activeTexture(self.gl.TEXTURE0 + id)
        self.gl.bindTexture(self.gl.TEXTURE_2D, texture)
        return id
      },
    }
  }

  createDoubleFBO(
    width: number,
    height: number,
    internalFormat: number,
    format: number,
    type: number,
    filter: number
  ): DoubleFBO {
    let fbo1 = this.createFBO(width, height, internalFormat, format, type, filter)
    let fbo2 = this.createFBO(width, height, internalFormat, format, type, filter)

    return {
      width,
      height,
      texelSizeX: 1.0 / width,
      texelSizeY: 1.0 / height,
      get read(): FBO {
        return fbo1
      },
      set read(value: FBO) {
        fbo1 = value
      },
      get write(): FBO {
        return fbo2
      },
      set write(value: FBO) {
        fbo2 = value
      },
      swap(): void {
        const temp = fbo1
        fbo1 = fbo2
        fbo2 = temp
      },
    }
  }

  getSupportedFormat(
    internalFormat: number,
    format: number,
    type: number
  ): TextureFormat | null {
    const { gl } = this

    if (!this.supportRenderTextureFormat(internalFormat, format, type)) {
      if (internalFormat === gl.RGBA) {
        return this.getSupportedFormat(gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE)
      }
      return null
    }

    return { internalFormat, format, type }
  }

  private supportRenderTextureFormat(
    internalFormat: number,
    format: number,
    type: number
  ): boolean {
    const { gl } = this

    const texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null)

    const fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)

    gl.deleteFramebuffer(fbo)
    gl.deleteTexture(texture)

    return status === gl.FRAMEBUFFER_COMPLETE
  }

  blit(target: FBO | null): void {
    const { gl } = this

    if (target === null) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    } else {
      gl.viewport(0, 0, target.width, target.height)
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
    }

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
  }

  prepareRender(): void {
    const { gl } = this
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)
  }

  dispose(): void {
    const { gl } = this
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer)
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer)
    this.vertexBuffer = null
    this.indexBuffer = null
  }
}
