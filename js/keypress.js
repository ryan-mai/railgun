AFRAME.registerComponent('clickable-key', {
init: function () {
    this.el.addEventListener('click', async () => {
    var playername = document.querySelector('#userText');
    var currentText = playername.getAttribute('troika-text').value;
    const letterEl = this.el.querySelector('[troika-text]');
    const letter = letterEl.getAttribute('troika-text').value;
    let newText = currentText;
    
    if (letter === "Backspace" && currentText.length > 0) {
        newText = currentText.substring(0, currentText.length - 1);
    } else if (letter !== "Submit" && letter !== "Backspace") {
        newText = currentText + letter;
    }
    if (newText.length <= 13) {
        playername.setAttribute('troika-text', {
        value: newText,
        anchor: 'left'
        });
    } else {
        console.log("DELETE A LETTER BRUHH");
    };
});
}
});