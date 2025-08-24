function configureDraco() {
    try {
    if (window.AFRAME && window.AFRAME.THREE && window.AFRAME.THREE.DRACOLoader) {
    var dracoInstance = new window.AFRAME.THREE.DRACOLoader();
    dracoInstance.setDecoderPath('dracoDecoderPath/');
    }
    } catch (err) {
    console.error('Failed to configure DRACOLoader:', err);
    }
}

if (window.AFRAME && window.AFRAME.THREE && window.AFRAME.THREE.DRACOLoader) {
    configureDraco();
} else {
    window.addEventListener('load', configureDraco);
}