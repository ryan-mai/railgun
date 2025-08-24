AFRAME.registerComponent('timer', {
    schema: {
        duration: {type: 'number', default: 60}
    },
    init: function() {
        var scoreEl = document.querySelector('#score');
        this.timeLeft = this.data.duration;
        this.timerEl = this.el;
        this.interval = null;

        this._startHandler = this.startTimer.bind(this);

        let text = scoreEl && scoreEl.getAttribute && scoreEl.getAttribute('troika-text') ? scoreEl.getAttribute('troika-text').value : '';
        const pattern = /[^0-9]/g;
        if (text && parseInt(text.replace(pattern, '')) > 0){
            this.startTimer();
        } else {
            document.addEventListener('first-hit', this._startHandler, { once: true });
        }
    },
    startTimer: function() {
        if (this.interval) return;
        this.timeLeft = this.data.duration;
        this.timerEl.setAttribute('troika-text', { value: `${this.timeLeft}s` });
        this.interval = setInterval(() => {
            if (this.timeLeft > 0) {
                this.timeLeft--;
                this.timerEl.setAttribute('troika-text', {value: `${this.timeLeft}s`});
            } else {
                clearInterval(this.interval);
                this.interval = null;
                window.location.reload();
            }
        }, 1000);
    },
    remove: function() {
        clearInterval(this.interval);
        this.interval = null;
        document.removeEventListener('first-hit', this._startHandler);
    }
});