// Display the trainer company name and logo
const dogsShow = document.getElementById('dogs');
dogsShow.classList.add('bg-transparent', 'p-3', 'rounded', 'd-flex', 'profile-card-border',);
dogsShow.classList.remove('d-none');

async function showDogs() {
    const response = await fetch('/clientDogsHome');
    const dogs = await response.json();

    for(let i = 0; i < dogs['dogs'].length; i++){
        let pic;
        if(dogs['dogs'][i].dogPic && dogs['dogs'][i].dogPic != ''){
            pic = dogs['dogs'][i].dogPic;
        } else {
            pic = 'images/DefaultAvatar.png'
        }
        let doc = `
            <div>
            <a href='/dog/${dogs['dogs'][i]._id}'>
                <img src="${pic}" class="rounded-circle" style="width: 80px; height: 80px; object-fit: cover;">
                <p>${dogs['dogs'][i].dogName}</p>
            </a>
            </div>
        `;
        dogsShow.innerHTML += doc;
    }
}

showDogs();