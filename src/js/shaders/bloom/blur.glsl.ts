export const bloomBlurShader = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform vec2 texelSize;
  uniform vec2 direction;
  varying vec2 vUv;

  void main() {
    vec3 color = vec3(0.0);
    vec2 off1 = vec2(1.3846153846) * direction * texelSize;
    vec2 off2 = vec2(3.2307692308) * direction * texelSize;
    color += texture2D(uTexture, vUv).rgb * 0.2270270270;
    color += texture2D(uTexture, vUv + off1).rgb * 0.3162162162;
    color += texture2D(uTexture, vUv - off1).rgb * 0.3162162162;
    color += texture2D(uTexture, vUv + off2).rgb * 0.0702702703;
    color += texture2D(uTexture, vUv - off2).rgb * 0.0702702703;
    gl_FragColor = vec4(color, 1.0);
  }
`
