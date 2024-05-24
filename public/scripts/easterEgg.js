document.addEventListener('DOMContentLoaded', () => {
    const easterEggButton = document.getElementById('easterEggButton');
    const dogContainer = document.getElementById('dogContainer');
    const scoreElement = document.getElementById('score');
    const livesElement = document.getElementById('lives');
    const startSound = document.getElementById('startSound');
    const overlay = document.getElementById('easterEggOverlay');

    let running = false;
    let score = 0;
    let lives = 3;
    
    // Initially hide the scoreBoard
    scoreBoard.classList.add('hidden');
    overlay.style.display = 'none';
    
    // if(currentUrl !== '/' || loggedIn) { return; } // If we're NOT on the homepage, get outta here.

    function updateScore() {
        scoreElement.textContent = score;
    }

    function updateLives() {
        livesElement.textContent = lives;
        if (lives <= 0) {
            alert('Game Over!');
            stopEasterEgg();
        }
    }

    function createDog() {
        const dog = document.createElement('div');
        dog.classList.add('dog');
        dog.style.top = `${Math.random() * (window.innerHeight - 100)}px`;
        dogContainer.appendChild(dog);

        // Ensure the dog is clickable
        dog.addEventListener('click', () => {
            console.log('Dog clicked!');
            dog.remove();
            score += 1;
            updateScore();
        });

        // Remove dog when it goes out of the screen
        setTimeout(() => {
            if (dog.parentElement) {
                console.log('Dog reached the end!');
                dog.remove();
                lives -= 1;
                updateLives();
            }
        }, 6000); // THIS SHOULD MATCH THE LENGTH OF THE CSS ANIMATION (5000ms = 5s)
    }

    function startEasterEgg() {
        if (running) return;
        running = true;

        // Play the start sound
        startSound.play();

        // Lock the page view
        document.body.style.overflow = 'hidden';
        overlay.style.display = 'block';

        // Show the scoreBoard
        scoreBoard.classList.remove('hidden');

        // Reset score and lives
        score = 0;
        lives = 3;
        updateScore();
        updateLives();

        // Create dogs at intervals
        const intervalId = setInterval(createDog, 500);

        // Stop the easter egg
        function stopEasterEgg() {
            running = false;
            clearInterval(intervalId);
            dogContainer.innerHTML = '';
            document.body.style.overflow = '';
            startSound.pause();
            startSound.currentTime = 0;
            scoreBoard.classList.add('hidden');
            overlay.style.display = 'none';
        }
        
        window.stopEasterEgg = stopEasterEgg;
    }

    easterEggButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent the button click from stopping the easter egg
        startEasterEgg();
    });
});
