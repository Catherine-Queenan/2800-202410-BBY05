let submitButton = document.getElementById("signUpSubmit");
let passwords = document.querySelectorAll(".passwordField");

passwords.forEach((passwordInput) => {
    passwordInput.addEventListener("input", (event) =>{

        let pass = document.getElementById("passwordField").value;
        let confirmPass = document.getElementById("confirmPasswordField").value;

        if(pass == confirmPass){
            submitButton.disabled = false;
            document.getElementById("passwordWarning").innerHTML = "";
        } else {
            submitButton.disabled = true;
            document.getElementById("passwordWarning").innerHTML = "Passwords don't match!";
        }

   })
});