//If profile is being editted, allow all profile inputs to be editted
let editButton = document.getElementById('editButton');
editButton.addEventListener('click', () => {
    let inputs = document.querySelectorAll(".profileInfo");
    inputs.forEach((input) => {
        input.disabled = false;
    });

    let picInput = document.getElementById('newProfilePic');
    picInput.style = 'display:block';

    let saveButton = document.getElementById('saveButton');
    saveButton.style = 'display:inline';
    editButton.style = 'display:none';

    let dogs = document.getElementById('dogSection');
    dogs.style = 'display:none';
});


//Find the profile image upload element
let picUpload = document.getElementById('profilePicInput');

//Change the image upload if a file was inputted
picUpload.addEventListener('input', (event) => {
    //get the image, its url and the element to display it in
    let imageFile = event.target.files[0]
    let path = URL.createObjectURL(imageFile);
    console.log(path);
    let profilePic = document.getElementById('profilePic');

    //update the image display
    profilePic.src = path;
});