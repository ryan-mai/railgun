var vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`;

var fragmentShader = `
varying vec2 vUv;
uniform vec3 color;
uniform float timeMsec; // A-Frame time in milliseconds.

void main() {
  float time = timeMsec / 1000.0; // Convert from A-Frame milliseconds to typical time in seconds.
  gl_FragColor = mix(
    vec4(mod(vUv , 0.05) * 20.0, 1.0, 1.0),
    vec4(color, 1.0),
    sin(time)
  );
}
`;
AFRAME.registerShader('grid-glitch', {
  schema: {
    color: {type: 'color', is: 'uniform'},
    timeMsec: {type: 'time', is: 'uniform'}
  },

  vertexShader: vertexShader,
  fragmentShader: fragmentShader
});