var menuButton = document.getElementById('menuButton');

//Toggles the Menu Panel
if(menuButton) {
    document.getElementById('menuButton').addEventListener('click', function() {
        var menu = document.getElementById('dropdownMenu');
        //Toggle the menu panel on or off depending on its existing state.
        if (menu.style.display === 'none') {
            menu.style.display = 'flex';
        } else {
            menu.style.display = 'none';
        }
    });
} //If you want, you can add some debug stuff in case you want to see when there isn't a menu button.