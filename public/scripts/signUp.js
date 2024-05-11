function confirmPassword(){
    let password = document.getElementById('passwordField').value;
    let confirmPassword = document.getElementById('confirmPasswordField').value
    console.log('made it');
    if(password != confirmPassword){
        alert("Pawsword doesn't match");
        return false;
    }
    return true;
}

document.getElementById('confirmPasswordField').addEventListener('input', confrimPassword());
