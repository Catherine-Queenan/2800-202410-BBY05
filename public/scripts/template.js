var menuButton = document.getElementById('menuButton');

// Toggles the Menu Panel
if (menuButton) {
    menuButton.addEventListener('click', function() {
        var menu = document.getElementById('dropdownMenu');
        menu.classList.toggle('menu-visible');
    });
}
