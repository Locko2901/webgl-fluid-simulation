export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface Resolution {
  width: number;
  height: number;
}

export interface SplatData {
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: RGB;
}

export interface TextureFormat {
  internalFormat: number;
  format: number;
  type: number;
}

export interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  attach(id: number): number;
}

export interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap(): void;
}

export interface ShaderProgram {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

export interface Programs {
  clear: ShaderProgram;
  display: ShaderProgram;
  splat: ShaderProgram;
  advection: ShaderProgram;
  divergence: ShaderProgram;
  curl: ShaderProgram;
  vorticity: ShaderProgram;
  pressure: ShaderProgram;
  gradientSubtract: ShaderProgram;
}

export interface Framebuffers {
  dye: DoubleFBO;
  velocity: DoubleFBO;
  divergence: FBO;
  curl: FBO;
  pressure: DoubleFBO;
}

export type ColorPalette = 'rainbow' | 'ocean' | 'fire' | 'neon' | 'sunset' | 'aurora' | 'cyberpunk' | 'forest' | 'monochrome' | 'pastel' | 'custom';

export interface CustomColor {
  hex: string;
  enabled: boolean;
}

export interface FluidConfig {
  SHOW_UI: boolean;
  AUTO_SAVE: boolean;
  SIM_RESOLUTION: number;
  DYE_RESOLUTION: number;
  DENSITY_DISSIPATION: number;
  VELOCITY_DISSIPATION: number;
  VELOCITY_DAMPING: number;
  PRESSURE_ITERATIONS: number;
  CURL: number;
  SPLAT_RADIUS: number;
  SPLAT_FORCE: number;
  AUTO_SPLATS: boolean;
  AUTO_SPLAT_FORCE: number;
  BLOOM: boolean;
  BLOOM_INTENSITY: number;
  BLOOM_THRESHOLD: number;
  COLOR_PALETTE: ColorPalette;
  CUSTOM_COLORS: CustomColor[];
  PAUSED: boolean;
  SHARPNESS: number;
  VIGNETTE: number;
  TURBULENCE: number;
  MARBLING: boolean;
  MARBLING_INTENSITY: number;
  RGB_MODE: boolean;
  RGB_SPEED: number;
  COLOR_INTENSITY: number;
  TARGET_FPS: number;
  TRANSPARENT: boolean;
}
