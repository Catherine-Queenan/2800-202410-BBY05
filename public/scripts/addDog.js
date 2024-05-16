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