/* Automatic resize for textareas, built with the help of ChatGPT */
function autoResizeTextarea() {
    const textareas = document.querySelectorAll('textarea.auto-resize');
    textareas.forEach(textarea => {
        textarea.style.height = 'auto'; // Reset the height to auto
        textarea.style.height = textarea.scrollHeight + 'px'; // Set the height to the scroll height

        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto'; // Reset the height to auto
            textarea.style.height = textarea.scrollHeight + 'px'; // Set the height to the scroll height
        });
    });
}

document.addEventListener('DOMContentLoaded', (event) => {
    autoResizeTextarea(); // Initialize the height based on initial content
});

// Reapply the autoResizeTextarea function when tabs are clicked
document.querySelectorAll('input[name="tab"]').forEach(tab => {
    tab.addEventListener('change', () => {
        setTimeout(() => {
            autoResizeTextarea(); // Reapply the auto-resize function to ensure proper resizing
        }, 100); // Small delay to allow tab content to be fully visible
    });
});