//If profile is being editted, allow all profile inputs to be editted
let inputs = document.querySelectorAll(".profileInfo");
let picInput = document.getElementById('newProfilePic');
let saveButton = document.getElementById('saveButton');
let dogs = document.getElementById('dogSection');
let cancelButton = document.getElementById('cancelEdit');
let emailNotifications = document.getElementById('emailNotifications');

let editButton = document.getElementById('editButton');
editButton.addEventListener('click', () => {
    inputs.forEach((input) => {
        input.disabled = false;
    });

    picInput.style = 'display:block';
    emailNotifications.disabled = false;

    saveButton.style = 'display:inline';
    editButton.style = 'display:none';
    cancelButton.style = 'display:inline';

    dogs.style = 'display:none';
});

cancelButton.addEventListener('click', () => {
    cancelButton.style = 'display:none';
    
    inputs.forEach((input) => {
        input.disabled = true;
    });

    picInput.style = 'display:none';
    emailNotifications.disabled = true;

    saveButton.style = 'display:none';
    editButton.style = 'display:inline';

    dogs.style = 'display:block';
});


//Find the profile image upload element
let picUpload = document.getElementById('profilePicInput');

//Change the image upload if a file was inputted
picUpload.addEventListener('input', (event) => {
    //get the image, its url and the element to display it in
    let imageFile = event.target.files[0];
    let path = URL.createObjectURL(imageFile);
    console.log(path);
    let profilePic = document.getElementById('profilePic');

    //update the image display
    profilePic.src = path;
});