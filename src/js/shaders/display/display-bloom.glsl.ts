export const displayBloomShader = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform sampler2D uBloom;
  uniform float bloomIntensity;
  uniform float vignetteAmount;
  uniform float sharpness;
  varying vec2 vUv;

  void main() {
    vec3 color = texture2D(uTexture, vUv).rgb;
    vec3 bloom = texture2D(uBloom, vUv).rgb;

    color += bloom * bloomIntensity;

    if (sharpness > 0.0) {
      vec3 blurred = (texture2D(uTexture, vUv + vec2(0.001, 0.0)).rgb +
                      texture2D(uTexture, vUv - vec2(0.001, 0.0)).rgb +
                      texture2D(uTexture, vUv + vec2(0.0, 0.001)).rgb +
                      texture2D(uTexture, vUv - vec2(0.0, 0.001)).rgb) * 0.25;
      color += (color - blurred) * sharpness;
    }

    color = pow(color, vec3(0.95));
    color = color / (1.0 + color * 0.5);

    if (vignetteAmount > 0.0) {
      vec2 uv = vUv * (1.0 - vUv.yx);
      float vig = uv.x * uv.y * 15.0;
      vig = pow(vig, 0.15 * vignetteAmount);
      color *= mix(1.0, vig, vignetteAmount);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`
