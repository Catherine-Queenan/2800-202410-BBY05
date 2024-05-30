document.addEventListener('DOMContentLoaded', () => {
    const clientListing = document.getElementById('clientListing');
    clientListing.innerHTML = '';

    clientsParsed.forEach((person) => {
        let template = document.getElementById('clientCardTemplate').innerHTML;
    
        // Replace placeholder strings with actual data
        template = template.replace('[firstNamePlaceholder]', person.firstName);
        template = template.replace('[lastNamePlaceholder]', person.lastName);
        template = template.replace('[emailPlaceholder]', person.email);
    
        // Create a temporary div to hold the template content
        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = template;
    
        // Find the profileLink element within the template content
        let profileLink = tempDiv.querySelector('.profileLink');
    
        // Set the href attribute of the profileLink
        profileLink.setAttribute('formaction', `/clientProfile/${person._id}`);
        
        // Find the container where dog names will be inserted
        let dogsContainer = tempDiv.querySelector('.dogsContainer');
        
        // Clear any existing content in the dogsContainer
        dogsContainer.innerHTML = '';

        /*
            Over here look
             look over here
              look over here
               look over here
                look over here
                 look over here 
                  look over here
                   look over here
                    look over here 
                     look over here
                      look over here
                       look over here
                        look over here
                         look over here
                          look over here
                          there is a second foreach loop that you need to add 
                          your classes to (using the same classes)
        */
        person.dogs.forEach(dog => {

            // Create the containing div
            let housingDiv = document.createElement('div');
            housingDiv.classList.add('CLASSES-FOR-HOUSING-DIV-HERE');

            // Create a div for the dog's picture
            let dogPicElement = document.createElement('div');
            dogPicElement.classList.add('rounded-circle', 'profileImg-style');

            // Create an img element for the dog's picture
            let imgElement = document.createElement('img');
            if(!dog.dogPic  || dog.dogPic == ''){
                dog.dogPic = 'images/DefaultAvatar.png';
            }
            imgElement.src = dog.dogPic; 
            imgElement.alt = dog.dogName;
            imgElement.className = 'dogPic';
            imgElement.classList.add('rounded-circle', 'profileImg-style');

            // Append the img element to the dogPicElement
            dogPicElement.appendChild(imgElement);

            // Create a div for the dog's name
            let dogNameElement = document.createElement('div');
            dogNameElement.className = 'dogName';
            dogNameElement.classList.add('CLASSES-FOR-DOG-NAME-TEXT-HERE');
            dogNameElement.textContent = dog.dogName;
            

            // Append the dogPicElement and dogNameElement to the dogsContainer
            housingDiv.appendChild(dogPicElement);
            housingDiv.appendChild(dogNameElement);
            dogsContainer.appendChild(housingDiv);
        });
        // Insert the compiled template into the client listing
        clientListing.appendChild(tempDiv.firstElementChild);
    });

    console.log('loaded page');
});

document.getElementById('searchInput').addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const clientListing = document.getElementById('clientListing');

    // Clear the client listing before populating it with search results
    clientListing.innerHTML = '';

    // Go through all clients, fill in the template, and insert if they match the search term
    clientsParsed.forEach((person) => {
        let name = person.firstName + " " + person.lastName;
        if (name.toLowerCase().includes(searchTerm)) {
            let template = document.getElementById('clientCardTemplate').innerHTML;

            // Replace placeholder strings with actual data
            template = template.replace('[firstNamePlaceholder]', person.firstName);
            template = template.replace('[lastNamePlaceholder]', person.lastName);
            template = template.replace('[emailPlaceholder]', person.email);

            // Create a temporary div to hold the template content
            let tempDiv = document.createElement('div');
            tempDiv.innerHTML = template;

            // Find the profileLink element within the template content
            let profileLink = tempDiv.querySelector('.profileLink');

            // Set the href attribute of the profileLink
            profileLink.setAttribute('formaction', `/clientProfile/${person._id}`);

            // Find the container where dog names will be inserted
            let dogsContainer = tempDiv.querySelector('.dogsContainer');
            
            // Clear any existing content in the dogsContainer
            dogsContainer.innerHTML = '';

            /*
            Over here look
             look over here
              look over here
               look over here
                look over here
                 look over here 
                  look over here
                   look over here
                    look over here 
                     look over here
                      look over here
                       look over here
                        look over here
                         look over here
                          look over here
                          Add your classes here as well
        */
            // Iterate over each dog and append its name to the dogsContainer
            person.dogs.forEach(dog => {

                // Create the containing div
                let housingDiv = document.createElement('div');
                housingDiv.classList.add('CLASSES-FOR-HOUSING-DIV-HERE');
    
                // Create a div for the dog's picture
                let dogPicElement = document.createElement('div');
                dogPicElement.classList.add('CLASSES-FOR-DOG-PICTURE-DIV-HERE');
    
                // Create an img element for the dog's picture
                let imgElement = document.createElement('img');
                imgElement.src = dog.dogPic; 
                imgElement.alt = dog.dogName;
                imgElement.className = 'dogPic';
                imgElement.classList.add('IMAGE-CLASSES-HERE-IF-NEEDED');
                
    
                // Append the img element to the dogPicElement
                dogPicElement.appendChild(imgElement);
    
                // Create a div for the dog's name
                let dogNameElement = document.createElement('div');
                dogNameElement.className = 'dogName';
                dogNameElement.classList.add('CLASSES-FOR-DOG-NAME-TEXT-HERE');
                dogNameElement.textContent = dog.dogName;
    
                // Append the dogPicElement and dogNameElement to the dogsContainer
                housingDiv.appendChild(dogPicElement);
                housingDiv.appendChild(dogNameElement);
                dogsContainer.appendChild(housingDiv);
            });

            // Insert the compiled template into the client listing
            clientListing.appendChild(tempDiv.firstElementChild);
        }
    });

    // If no matching clients are found display a message
    if (clientListing.childElementCount === 0) {
        clientListing.innerHTML = '<p>No matching clients found.</p>';
    }
});

