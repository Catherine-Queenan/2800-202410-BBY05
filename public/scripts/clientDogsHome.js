// Display the trainer company name and logo
const dogsShow = document.getElementById('dogs');
dogsShow.classList.add('whiteBackgroundFade', 'p-3', 'rounded', 'd-flex', 'justify-content-between', 'flex-wrap', 'profile-card-border',);
dogsShow.classList.remove('d-none');

async function showDogs() {
    //All client dogs are displayed in a json at this link
    const response = await fetch('/clientDogsHome');
    const dogs = await response.json();

    //Create div element for each dog and added to the innerHTML of the container
    for(let i = 0; i < dogs['dogs'].length; i++){
        let pic;
        if(dogs['dogs'][i].dogPic && dogs['dogs'][i].dogPic != ''){
            pic = dogs['dogs'][i].dogPic;
        } else {
            pic = 'images/DefaultAvatar.png'
        }
        let doc = `
            <div class="text-center">
            <a href='/dog/${dogs['dogs'][i]._id}'>
                <img src="${pic}" class="rounded-circle" style="width: 80px; height: 80px; object-fit: cover;">
                <p class="text-center yeseva-one h5 mt-2 mb-0">${dogs['dogs'][i].dogName}</p>
            </a>
            </div>
        `;
        dogsShow.innerHTML += doc;
    }
}

showDogs();