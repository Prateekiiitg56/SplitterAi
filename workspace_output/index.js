const navMenu = document.getElementById('nav-menu');
const slider = document.getElementById('slider');

navMenu.addEventListener('click', () => {
  // Toggle navigation menu
  navMenu.classList.toggle('active');
});

slider.addEventListener('input', (e) => {
  // Update slider value
  const value = e.target.value;
  console.log(`Slider value: ${value}`);
});