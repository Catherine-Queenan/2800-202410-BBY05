let vaccineInputs = document.querySelectorAll(".vaccination");

vaccineInputs.forEach((vaccineCheck) => {
    vaccineCheck.addEventListener("change", (event) =>{
        let dateId = vaccineCheck.id + "DateDiv";
        let fileId = vaccineCheck.id + "ProofDiv";

        let expireDateInput = document.getElementById(dateId);
        let proofFileInput = document.getElementById(fileId);

        if(vaccineCheck.checked){
            expireDateInput.style = "display: block";
            proofFileInput.style = "display: block";

            expireDateInput.required = true;
            proofFileInput.required = true;
        } else {
            expireDateInput.style = "display: none";
            proofFileInput.style = "display: none"

            expireDateInput.required = false;
            proofFileInput.required = false;
        }
    })
});

let picUpload = document.getElementById('dogPicInput');

picUpload.addEventListener('input', (event) => {
    let imageFile = event.target.files[0]
    let path = URL.createObjectURL(imageFile);
    console.log(path);
    let dogPic = document.getElementById('demoPic');

    dogPic.src = path;
});