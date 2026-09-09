/* Add JavaScript functionality to the navbar for responsiveness and interactivity */
// Get the navbar element
const navbar = document.querySelector('.navbar');
// Add event listener for responsive functionality
window.addEventListener('resize', () => {
  if (window.innerWidth < 768) {
    // Add mobile-specific functionality
    navbar.classList.add('mobile-nav');
  } else {
    // Remove mobile-specific functionality
    navbar.classList.remove('mobile-nav');
  }
});
// Add event listener for interactivity
navbar.addEventListener('click', (e) => {
  if (e.target.classList.contains('nav-link')) {
    // Add functionality for nav link clicks
    e.target.classList.add('active');
  }
});