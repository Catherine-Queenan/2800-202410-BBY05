// Displays the previously hidden sessionList
const clientListing = document.getElementById('clientList');
clientListing.classList.add('bg-transparent', 'p-3', 'rounded', 'profile-card-border', 'd-flex', 'flex-wrap', 'justify-content-center');
clientListing.classList.remove('d-none');


document.addEventListener('DOMContentLoaded', async () => {
    
    clientListing.innerHTML = '';

    async function fetchClients() {
        const response = await fetch('/api/clients');
        if (response.ok) {
            const clients = await response.json();
            return clients;
        } else {
            console.error('Failed to fetch clients');
            return [];
        }
    }

    function createClientCard(person) {
        let template = document.getElementById('clientCardTemplate').innerHTML;

        template = template.replace('[firstNamePlaceholder]', person.firstName);
        template = template.replace('[lastNamePlaceholder]', person.lastName);
        template = template.replace('[emailPlaceholder]', person.email);

        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = template;

        let profileLink = tempDiv.querySelector('.profileLink');
        profileLink.setAttribute('formaction', `/clientProfile/${person._id}`);

        let dogsContainer = tempDiv.querySelector('.dogsContainer');
        dogsContainer.innerHTML = '';

        // Assuming person.dogs is an array of dog objects with properties dogName and dogPic
        if (person.dogs) {
            person.dogs.forEach(dog => {
                let housingDiv = document.createElement('div');
                housingDiv.classList.add('d-flex', 'flex-column', 'align-items-center', 'justify-content-center',);

                let dogPicElement = document.createElement('div');
                dogPicElement.classList.add('rounded-circle', 'profileImg-style', 'm-2');

                let imgElement = document.createElement('img');
                if(!dog.dogPic  || dog.dogPic == ''){
                    dog.dogPic = 'images/DefaultAvatar.png';
                }
                imgElement.src = dog.dogPic;
                imgElement.alt = dog.dogName;
                imgElement.className = 'dogPic';
                imgElement.classList.add('rounded-circle', 'profileImg-style');
                

                dogPicElement.appendChild(imgElement);

                let dogNameElement = document.createElement('div');
                dogNameElement.className = 'dogName';
                dogNameElement.classList.add('h3');
                dogNameElement.textContent = dog.dogName;

                housingDiv.appendChild(dogPicElement);
                housingDiv.appendChild(dogNameElement);
                dogsContainer.appendChild(housingDiv);
            });
        }

        return tempDiv.firstElementChild;
    }

    const clientsParsed = await fetchClients();

    clientsParsed.forEach(person => {
        const clientCard = createClientCard(person);
        console.log(clientCard)
        clientListing.appendChild(clientCard);
    });

    console.log('Client list loaded');
});


