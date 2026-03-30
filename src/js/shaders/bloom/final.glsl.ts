export const bloomFinalShader = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform sampler2D uBloom;
  uniform float intensity;
  varying vec2 vUv;

  void main() {
    vec3 color = texture2D(uTexture, vUv).rgb;
    vec3 bloom = texture2D(uBloom, vUv).rgb;
    color += bloom * intensity;
    color = color / (1.0 + color);
    gl_FragColor = vec4(color, 1.0);
  }
`
