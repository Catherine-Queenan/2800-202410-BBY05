//If profile is being editted, allow all profile inputs to be editted
let inputs = document.querySelectorAll(".profileInfo");
inputs.forEach((input) => {
    input.disabled = false;
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