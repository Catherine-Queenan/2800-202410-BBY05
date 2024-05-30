// Display the trainer company name and logo
const trainerShow = document.getElementById('trainer');
trainerShow.classList.add('bg-transparent', 'p-3', 'rounded', 'profile-card-border', 'd-flex');
trainerShow.classList.remove('d-none');

async function showTrainer() {
    const response = await fetch('/clientTrainerHome');
    const trainer = await response.json();

    let logo;
    if(trainer.logo){
        logo = trainer.logo;
    } else {
        logo = '/images/DefaultAvatar.png';
    }

    let doc = `
        <div>
            <img src="${logo}" class="rounded-circle" style="width:60px; height: 60px; object-fit: cover;">
            <span>${trainer.companyName}</span>
        </div>
    `;
    trainerShow.innerHTML = doc;
}

showTrainer();