AFRAME.registerComponent('logout', {
init: function () {
    this.el.addEventListener('click', function (evt) {
    window.location.href = "logout.html";
    });
}
});