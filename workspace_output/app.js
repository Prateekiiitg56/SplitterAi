document.addEventListener('DOMContentLoaded', () => {
    const booksGrid = document.querySelector('.books-grid');
    const loadMoreBtn = document.getElementById('load-more');

    let books = [];
    let currentIndex = 0;
    const batchSize = 4;

    // Fetch books data
    fetch('books.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load books data');
            }
            return response.json();
        })
        .then(data => {
            books = data;
            renderBooks(currentIndex, currentIndex + batchSize);
            currentIndex += batchSize;
            if (currentIndex >= books.length) {
                loadMoreBtn.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            booksGrid.innerHTML = '<p>Failed to load books. Please try again later.</p>';
            loadMoreBtn.style.display = 'none';
        });

    function renderBooks(start, end) {
        const batch = books.slice(start, end);
        batch.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';

            const img = document.createElement('img');
            img.src = book.coverUrl;
            img.alt = `${book.title} cover`;
            card.appendChild(img);

            const info = document.createElement('div');
            info.className = 'book-info';

            const title = document.createElement('h3');
            title.textContent = book.title;
            info.appendChild(title);

            const author = document.createElement('p');
            author.className = 'author';
            author.textContent = `by ${book.author}`;
            info.appendChild(author);

            const genre = document.createElement('span');
            genre.className = 'genre';
            genre.textContent = book.genre;
            info.appendChild(genre);

            card.appendChild(info);
            booksGrid.appendChild(card);
        });
    }

    loadMoreBtn.addEventListener('click', () => {
        if (currentIndex >= books.length) {
            loadMoreBtn.style.display = 'none';
            return;
        }
        const end = Math.min(currentIndex + batchSize, books.length);
        renderBooks(currentIndex, end);
        currentIndex = end;
        if (currentIndex >= books.length) {
            loadMoreBtn.style.display = 'none';
        }
    });
});