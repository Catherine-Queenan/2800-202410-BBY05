// var editMade = false;
// let seeMoreButtons = document.querySelectorAll(".seeMore");

// seeMoreButtons.forEach((button) => {
//     button.onclick = ()=>{
//         let modal = document.getElementById(button.name + "Modal")
//         modal = new bootstrap.Modal(modal);
//         let inputs = document.querySelectorAll(".modalInput");
//         inputs.forEach((input) => {
//             input.disabled = true;
//         });

//         modal.show();
//     }
// });

// let closeButtons = document.querySelectorAll(".closeModalButton");
// closeButtons.forEach((button) => {
//     button.onclick = ()=>{
//         console.log(editMade);
//         if(editMade){
//             let form = document.getElementById(button.name + "UpdateForm");
//             console.log(form);
//             form.submit();
//             editMade = false;
//         } else {
//             let modal = document.getElementById(button.name + "Modal");
//             modal.hide();
//         }

        
//     }
// });

// let editButtons = document.querySelectorAll(".editButton");
// editButtons.forEach((button) => {
//     button.onclick = ()=>{
//         editMade = true;
//         button.style = 'display:none';

//         let inputFields = document.querySelectorAll(".field" + button.name);
//         inputFields.forEach((input)=>{
//             input.disabled = false;
//         });

//         let picUpload = document.getElementById(button.name + 'newDogPic');
//         picUpload.style = 'display:block';

//         //Change the image upload if a file was inputted
//         picUpload.addEventListener('input', (event) => {
//             //get the image, its url and the element to display it in
//             let imageFile = event.target.files[0]
//             let path = URL.createObjectURL(imageFile);
//             let dogPic = document.getElementById(button.name +'ModalPic');

//             //update the image display
//             dogPic.src = path;
//         });
//         let closeButton = document.getElementById(button.name + 'CloseButton')
//         closeButton.disabled = true;

//         let closeWarning = document.getElementById(button.name + 'CloseWarning');
//         closeWarning.style = 'display:inline';

//         let saveButton = document.getElementById(button.name + 'SaveButton');

//         saveButton.style = 'display:block';

//         saveButton.onclick = ()=>{
//             button.style = 'display:block';
//             saveButton.style = 'display:none';
//             inputFields.forEach((input)=>{
//                 input.disabled = true;
//             });

//             closeButton.disabled = false;
//             closeWarning.style = 'display:none';
//             picUpload.style = 'display:none';
//         }
//     }
// });