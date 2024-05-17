//Find all vaccination checkboxes
let vaccineInputs = document.querySelectorAll(".vaccination");

//Add an event listener for all checkboxes to show the expiration date and file upload option if the checkmark is checked
vaccineInputs.forEach((vaccineCheck) => {
    vaccineCheck.addEventListener("change", (event) =>{
        //Get the id of the html divs with date input and the vaccination record input
        let dateId = vaccineCheck.id + "DateDiv";
        let fileId = vaccineCheck.id + "ProofDiv";

        //Get the elements with the div ids
        let expireDateInput = document.getElementById(dateId);
        let proofFileInput = document.getElementById(fileId);

        //Get the input element
        dateInput = expireDateInput.children[1];
        fileInput = proofFileInput.children[2];

        //If the checkbox was checked
        if(vaccineCheck.checked){
            //Shows the html elements
            expireDateInput.style = "display: block";
            proofFileInput.style = "display: block";

            //makes the required
            dateInput.required = true;
            fileInput.required = true;
            
        //If the checkbox was unchecked
        } else {
            //Hide the html elements
            expireDateInput.style = "display: none";
            proofFileInput.style = "display: none"

            //Make them not required
            dateInput.required = false;
            fileInput.required = false;
        }
    })
});

//Find the dog image upload element
let picUpload = document.getElementById('dogPicInput');

//Change the image upload if a file was inputted
picUpload.addEventListener('input', (event) => {
    //get the image, its url and the element to display it in
    let imageFile = event.target.files[0]
    let path = URL.createObjectURL(imageFile);
    let dogPic = document.getElementById('demoPic');

     //update the image display
    dogPic.src = path;
});