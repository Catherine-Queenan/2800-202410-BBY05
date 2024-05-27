
// Responsible for loading everyone before hand
document.addEventListener('DOMContentLoaded', () => {

    // Grab the id from the clientList ejs doc
    const clientListing = document.getElementById('clientListing');

    // Empty it to account for any errors or leftovers
    clientListing.innerHTML = '';

    // Go through all clients, fill in the template, and insert
    clientsParsed.forEach((person) => {
        let template = document.getElementById('clientCardTemplate').innerHTML;

        // Replace placeholder strings with actual data
        template = template.replace('[firstNamePlaceholder]', person.firstName);
        template = template.replace('[lastNamePlaceholder]', person.lastName);
        template = template.replace('[emailPlaceholder]', person.email);

        //----------------------
        // Create a temporary div to hold the template content
        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = template;

        // Find the profileLink element within the template content
        let profileLink = tempDiv.querySelector('.profileLink');

        // Set the href attribute of the profileLink
        if (profileLink) {
            profileLink.href = `/clientProfile/${person._id}`;
            console.log('linked!');
        }
        //-----------------------


        // Insert the compiled template into the client listing
        document.getElementById('clientListing').insertAdjacentHTML('beforeend', template);

        
    });
    console.log('loaded page')
});

// This event listener is for if anything is entered into the search bar. It updates dymanically
document.getElementById('searchInput').addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();

    // Clear the client listing before populating it with search results
    document.getElementById('clientListing').innerHTML = '';

    // Go through all clients, fill in the template, and insert
    clientsParsed.forEach((person) => {
        let name = person.firstName + " " + person.lastName;
        if (name.toLowerCase().includes(searchTerm)) {
            let template = document.getElementById('clientCardTemplate').innerHTML;

            // Replace placeholder strings with actual data
            template = template.replace('[firstNamePlaceholder]', person.firstName);
            template = template.replace('[lastNamePlaceholder]', person.lastName);
            template = template.replace('[emailPlaceholder]', person.email);

            // Insert the compiled template into the client listing
            document.getElementById('clientListing').insertAdjacentHTML('beforeend', template);
        }
    });

    // If no matching clients are found display a message
    if (document.getElementById('clientListing').childElementCount === 0) {
        document.getElementById('clientListing').innerHTML = '<p>No matching clients found.</p>';
    }
});
