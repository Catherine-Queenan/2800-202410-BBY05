// Display the trainer company name and logo
const trainerShow = document.getElementById('trainer');
trainerShow.classList.add('whiteBackgroundFade', 'p-3', 'rounded', 'profile-card-border');
trainerShow.classList.remove('d-none');

async function showTrainer() {
    //Trainer info displayed in a json at link
    const response = await fetch('/clientTrainerHome');
    const trainer = await response.json();

    let logo;
    if(trainer.logo){
        logo = trainer.logo;
    } else {
        logo = '/images/DefaultAvatar.png';
    }

    let doc = `
    <a href="viewBusiness/${trainer.companyName}">
        <div class="d-flex">
            <img src="${logo}" class="rounded-circle" style="width:80px; height: 80px; object-fit: cover;">
            <span class="card-title h4 text-center yeseva-one align-content-center">${trainer.companyName}</span>
        </div>
        </a>
    `;
    trainerShow.innerHTML = doc;
}

showTrainer();