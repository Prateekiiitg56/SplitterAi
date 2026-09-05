document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('display');
    const buttons = document.querySelectorAll('.btn');

    let currentInput = '';

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const id = button.id;
            const text = button.textContent;

            if (id === 'clear') {
                currentInput = '';
                display.value = '';
            } else if (id === 'delete') {
                currentInput = currentInput.slice(0, -1);
                display.value = currentInput;
            } else if (id === 'equals') {
                try {
                    if (!currentInput) return;
                    // Sanitize expression and evaluate safely
                    // Allow only digits, basic math operators, and decimal points
                    if (/^[0-9+\-*/. ]+$/.test(currentInput)) {
                        const result = eval(currentInput);
                        display.value = result;
                        currentInput = String(result);
                    } else {
                        throw new Error('Invalid Pattern');
                    }
                } catch (e) {
                    display.value = 'Error';
                    currentInput = '';
                }
            } else {
                // If it's an operator or number
                // Convert visual operators / back to code if necessary (we are already using ASCII /, *, -, +)
                currentInput += text;
                display.value = currentInput;
            }
        });
    });
});