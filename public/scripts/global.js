/* Automatic resize for textareas */
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

