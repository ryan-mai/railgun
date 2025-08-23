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
uniform vec3 gridColor;
uniform float timeMsec;

void main() {
  float time = timeMsec / 1000.0;
  vec4 grid = vec4(mod(vUv , 0.05) * 10.0, 1.0, 1.0);
  vec4 base = vec4(gridColor, 1.0);
  vec3 newColor = vec3(sin(time));
  gl_FragColor = 
  grid,
    sin(time)
  ;
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
