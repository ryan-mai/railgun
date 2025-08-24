AFRAME.registerComponent('user-audio-unlock', {
init: function () {
    var played = false;
    var tryPlay = function () {
        if (played) return;
        var scene = document.querySelector('a-scene');
        var soundEl = document.querySelector('[sound]');
        console.log('[user-audio-unlock] user gesture detected - attempting to unlock audio', { soundEl: !!soundEl });
        if (soundEl && soundEl.components && soundEl.components.sound) {
            try {
                soundEl.components.sound.playSound();
                console.log('[user-audio-unlock] playSound called');
            } catch (e) { console.warn('[user-audio-unlock] playSound failed', e); }
        } else {
            var asset = document.querySelector('#sao_op');
            if (asset && typeof asset.play === 'function') {
                try { asset.play(); console.log('[user-audio-unlock] played HTML audio asset'); } catch (e) { console.warn('[user-audio-unlock] asset.play failed', e); }
            } else {
                console.warn('[user-audio-unlock] no sound component or asset to play');
            }
        }
        played = true;
                    try {
                        var resumed = false;
                        if (window.AFRAME && Array.isArray(window.AFRAME.scenes)) {
                            window.AFRAME.scenes.forEach(function (sc) {
                                try {
                                    if (sc && sc.audioListener && sc.audioListener.context && sc.audioListener.context.state === 'suspended') {
                                        sc.audioListener.context.resume().then(function () { console.log('[user-audio-unlock] resumed AFRAME.scenes audioListener.context'); });
                                        resumed = true;
                                    }
                                    if (sc && sc.sceneEl && sc.sceneEl.audioListener && sc.sceneEl.audioListener.context && sc.sceneEl.audioListener.context.state === 'suspended') {
                                        sc.sceneEl.audioListener.context.resume().then(function () { console.log('[user-audio-unlock] resumed sceneEl.audioListener.context'); });
                                        resumed = true;
                                    }
                                } catch (e) { /* ignore */ }
                            });
                        }
                        try {
                            if (scene && scene.audioListener && scene.audioListener.context && scene.audioListener.context.state === 'suspended') {
                                scene.audioListener.context.resume().then(function () { console.log('[user-audio-unlock] resumed scene.audioListener.context'); });
                                resumed = true;
                            }
                        } catch (e) {}
                        if (!resumed) console.log('[user-audio-unlock] no suspended audio context found to resume');
                    } catch (e) { console.warn('[user-audio-unlock] resume attempt failed', e); }
        // remove listeners
        window.removeEventListener('click', tryPlay);
        window.removeEventListener('touchstart', tryPlay);
        window.removeEventListener('keydown', tryPlay);
    };
    window.addEventListener('click', tryPlay, { passive: true });
    window.addEventListener('touchstart', tryPlay, { passive: true });
    window.addEventListener('keydown', tryPlay, { passive: true });
    var scene = document.querySelector('a-scene');
    if (scene) scene.addEventListener('loaded', function () {
        console.log('[user-audio-unlock] scene loaded');
    });
}
});