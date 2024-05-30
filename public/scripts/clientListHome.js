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
                if(!dog.dogPic || dog.dogPic == ''){
                    dog.dogPic = 'images/DefaultAvatar.png';
                }
                imgElement.src = dog.dogPic;
                imgElement.alt = dog.dogName;
                imgElement.classList.add('rounded-circle', 'profileImg-style', 'dogPic');

                dogPicElement.appendChild(imgElement);

                let dogNameElement = document.createElement('div');
                dogNameElement.classList.add('dogName', 'CLASSES-FOR-DOG-NAME-TEXT-HERE');
                dogNameElement.textContent = dog.dogName;

                housingDiv.appendChild(dogPicElement);
                housingDiv.appendChild(dogNameElement);
                dogsContainer.appendChild(housingDiv);
            });
        }

        // Wrap the client card in an anchor element
        let anchor = document.createElement('a');
        anchor.href = `/clientProfile/${person._id}`;
        anchor.appendChild(tempDiv.firstElementChild);

        return anchor;
    }

    const clientsParsed = await fetchClients();

    clientsParsed.forEach(person => {
        const clientCard = createClientCard(person);
        clientListing.appendChild(clientCard);
    });

    console.log('Client list loaded');
});



