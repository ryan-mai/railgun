AFRAME.registerComponent('auto-audio-resume', {
schema: {
    targetVolume: { type: 'number', default: 0.5 },
    fadeDuration: { type: 'number', default: 2000 }
},
init: function () {
    var el = this.el;
    var targetVolume = this.data.targetVolume;
    var fadeDuration = this.data.fadeDuration;

    var resumeAndPlay = function () {
    try {
        var resumed = false;
        if (window.AFRAME && Array.isArray(window.AFRAME.scenes)) {
        window.AFRAME.scenes.forEach(function (sc) {
            try {
            if (sc && sc.audioListener && sc.audioListener.context && sc.audioListener.context.state === 'suspended') {
                sc.audioListener.context.resume();
                resumed = true;
            }
            if (sc && sc.sceneEl && sc.sceneEl.audioListener && sc.sceneEl.audioListener.context && sc.sceneEl.audioListener.context.state === 'suspended') {
                sc.sceneEl.audioListener.context.resume();
                resumed = true;
            }
            } catch (e) { /* ignore */ }
        });
        }
        if (el && el.audioListener && el.audioListener.context && el.audioListener.context.state === 'suspended') {
        el.audioListener.context.resume();
        resumed = true;
        }
    } catch (e) { /* ignore */ }

    // Find our bg music entity (id="bgMusic") and start it with a fade-in
    var bg = document.getElementById('bgMusic');
    if (!bg) bg = document.querySelector('a-entity[sound]');
    if (bg && bg.components && bg.components.sound) {
        try {
        bg.setAttribute('sound', 'volume', 0);
        bg.components.sound.playSound();
        } catch (e) { /* ignore */ }

        // Fade to targetVolume
        try {
        var start = Date.now();
        var interval = 50;
        var step = function () {
            var elapsed = Date.now() - start;
            var t = Math.min(1, elapsed / fadeDuration);
            var vol = t * targetVolume;
            try { bg.setAttribute('sound', 'volume', vol); } catch (e) {}
            if (t < 1) setTimeout(step, interval);
        };
        step();
        } catch (e) { /* ignore */ }
    }
    };

    el.addEventListener('loaded', function () {
    setTimeout(resumeAndPlay, 50);
    });
}
});