  AFRAME.registerComponent('updateScore', {
    schema: {
      target: { type: 'selector', default: '#score' },
      base: { type: 'number', default: 0 }
    },
    init: function () {
      this.score = this.data.target;
    },
    tick: function () {
      this.el.addEventListener
      this.score.object3D.position.x = this.data.baseX + playerX;
    }
  });
  function getRnd(min, max) {
    return Math.floor(Math.random() * (max - min) ) + min;
  }