AFRAME.registerComponent('clickable', {
  schema: {
    score: { type: 'number', default: 0 },
  },
  init: function () {
    var target = document.querySelector('#target');
    var scoreEl = document.querySelector('#score');
    var scoreValue = 0;

    var lastIndex = -1;
    var COLORS = ['red', 'green', 'blue'];
  this.el.addEventListener('click', async function (evt) {
      lastIndex = (lastIndex + 1) % COLORS.length;
      this.setAttribute('material', 'color', COLORS[lastIndex]);
      target.object3D.position.x = getRnd(-5,5);
      target.object3D.position.y = getRnd(-5,5);
      scoreValue += 1;

      if (evt && evt.detail && evt.detail.intersection && evt.detail.intersection.point) {
        const p = evt.detail.intersection.point;
        console.log('Hit At:', p.x.toFixed(2), p.y.toFixed(2), p.z.toFixed(2));
      } else {
        console.log('Hit event (no intersection.point):', evt && evt.detail ? evt.detail : evt);
      }

      if (scoreValue === 1) {
        const detail = evt && evt.detail && evt.detail.intersection && evt.detail.intersection.point
          ? { point: evt.detail.intersection.point }
          : {};
        document.dispatchEvent(new CustomEvent('first-hit', { detail }));
      }

      if (scoreEl && typeof scoreEl.setAttribute === 'function') {
        scoreEl.setAttribute('troika-text', {value: `Score: ${scoreValue}`});
      }

      try { localStorage.setItem('playerScore', String(scoreValue)); } catch (e) {}
      if (typeof updateScore === 'function') {
        // Prefer the Players document id saved at account creation (playerId).
        // This matches the doc created with db.collection('Players').add(...) in auth.js.
        const uid = localStorage.getItem('playerId') ||
                    (window && window.auth && window.auth.currentUser && window.auth.currentUser.uid) ||
                    localStorage.getItem('playerUid') ||
                    null;
        try {
          const updated = await updateScore(uid, scoreValue);
          console.info('collisionDetection: updateScore returned', updated, 'for', uid);
        } catch (e) {
          console.error('updateScore threw/rejected for', uid, e);
        }
      } else {
        // updateScore not present; nothing to do here.
      }
    });
  }
});