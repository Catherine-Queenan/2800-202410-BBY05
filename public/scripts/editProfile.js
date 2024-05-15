let inputs = document.querySelectorAll(".profileInfo");
inputs.forEach((input) => {
    input.disabled = false;
});

let picUpload = document.getElementById('profilePicInput');

picUpload.addEventListener('input', (event) => {
    let imageFile = event.target.files[0]
    let path = URL.createObjectURL(imageFile);
    console.log(path);
    //let profilePic = document.getElementById('profilePic');

    profilePic.src = path;
});