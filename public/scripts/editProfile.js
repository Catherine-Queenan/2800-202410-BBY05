//If profile is being editted, allow all profile inputs to be editted
let inputs = document.querySelectorAll(".profileInfo");
let picInput = document.getElementById('newProfilePic');
let saveButton = document.getElementById('saveButton');
let dogs = document.getElementById('dogSection');
let cancelButtons = document.querySelectorAll('.cancelButton');
let cancelButton = document.getElementById('cancelEdit');
let emailNotifications = document.getElementById('emailNotifications');

let editButton = document.getElementById('editButton');

let originalValues = {};
let profileEditable = false;
editButton.addEventListener('click', () => {
    profileEditable = true;
    inputs.forEach((input) => {
        input.disabled = false;
        originalValues[input.name] = input.value;
    });

    picInput.style = 'display:block';
    emailNotifications.disabled = false;

    saveButton.style = 'display:inline';
    editButton.style = 'display:none';
    cancelButton.style = 'display:inline';

    dogs.style = 'display:none';
});

cancelButtons.forEach((button) => {
    button.addEventListener('click', () => {
        if(profileEditable){
            profileEditable = false;
            cancelButton.style = 'display:none';
        
            inputs.forEach((input) => {
                input.disabled = true;
                input.value = originalValues[input.name];
            });
        
            picInput.style = 'display:none';
            emailNotifications.disabled = true;
        
            saveButton.style = 'display:none';
            editButton.style = 'display:inline';
        
            dogs.style = 'display:block';
        }
    });
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