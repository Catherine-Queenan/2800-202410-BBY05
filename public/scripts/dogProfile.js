function showFullDog(dog){
    let modalId = "modal-" + dog.dogName;
    console.log(modalId);
    modal.show();
}

let modals = document.querySelectorAll(".modal");
modals.forEach((modal) => {
    modal = new bootstrap.Modal(document.getElementById(modal.id));
});
