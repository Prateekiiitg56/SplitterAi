const navMenu = document.getElementById('nav-menu');
navMenu.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    const menuItem = e.target.closest('li');
    const activeMenuItems = navMenu.querySelectorAll('.active');
    activeMenuItems.forEach((item) => item.classList.remove('active'));
    menuItem.classList.add('active');
  }
});