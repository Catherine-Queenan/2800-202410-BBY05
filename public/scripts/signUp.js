//store elements needed for event handling
let submitButton = document.getElementById("signUpSubmit");
let passwords = document.querySelectorAll(".passwordField");

//listen for inputs in both of the password fields (password and confirm password)
passwords.forEach((passwordInput) => {
    passwordInput.addEventListener("input", (event) =>{

        //Store values entered in the two form fields
        let pass = document.getElementById("passwordField").value;
        let confirmPass = document.getElementById("confirmPasswordField").value;

        //Compare the two values
        //If the passwords match, enable the submit button and get rid of warning 
        if(pass == confirmPass){
            submitButton.disabled = false;
            document.getElementById("passwordWarning").innerHTML = "";
        
        //If the passwords don't match, disable the button and warn the user
        } else {
            submitButton.disabled = true;
            document.getElementById("passwordWarning").innerHTML = "Passwords don't match!";
        }

   })
});