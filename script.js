document.addEventListener('DOMContentLoaded', () => {
    // L'URL de votre nouvelle fonction backend Vercel.
    const BACKEND_API_URL = 'https://agenda-good.vercel.app/api/events';

    let events = []; // Cet array sera rempli par les données du backend

    const eventsListDiv = document.getElementById('events-list');
    const dateFilter = document.getElementById('date-filter');
    const cityFilter = document.getElementById('city-filter');
    const typeFilter = document.getElementById('type-filter');

    // Fonction pour afficher les événements
    async function displayEvents(filteredEvents) {
        eventsListDiv.innerHTML = ''; // Vide la liste actuelle

        if (filteredEvents.length === 0) {
            eventsListDiv.innerHTML = '<p class="no-events-message">Aucun événement ne correspond à vos critères de recherche.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        for (const event of filteredEvents) {
            const eventCard = document.createElement('div');
            eventCard.classList.add('event-card');

            // Formatage de la date pour le carré à gauche
            // Convertit JJ/MM/AAAA en un format YYYY-MM-DD pour Date()
            const dateParts = event.date.split('/');
            const formattedDateForDisplay = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : event.date;
            const eventDate = new Date(formattedDateForDisplay);

            if (isNaN(eventDate.getTime())) {
                console.warn(`Date non valide pour l'événement "${event.name}": ${event.date}.`);
                continue;
            }

            const month = eventDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
            const day = eventDate.getDate();

            eventCard.innerHTML = `
                <div class="event-date-box">
                    <span class="month">${month}</span>
                    <span class="day">${day}</span>
                </div>
                <div class="event-main-info">
                    <h2>${event.name}</h2>
                    <p class="type">${event.type}</p>
                    <p>${event.location}, ${event.city}</p>
                </div>
                <div class="event-actions">
                    <a href="${event.link}" target="_blank" class="event-link">Réserver</a>
                    ${event.description && event.description.trim() !== '' ? `<button class="toggle-description-btn" data-event-id="${event.id}">Plus d'infos</button>` : ''}
                </div>
            `;
            fragment.appendChild(eventCard);

            if (event.description && event.description.trim() !== '') {
                const descriptionDiv = document.createElement('div');
                descriptionDiv.classList.add('event-description');
                descriptionDiv.id = `description-${event.id}`;
                descriptionDiv.innerHTML = `<p>${event.description}</p>`;
                fragment.appendChild(descriptionDiv);
            }
        }
        eventsListDiv.appendChild(fragment);

        document.querySelectorAll('.toggle-description-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.eventId;
                const descriptionDiv = document.getElementById(`description-${eventId}`);
                if (descriptionDiv) {
                    descriptionDiv.classList.toggle('show');
                    if (descriptionDiv.classList.contains('show')) {
                        e.target.textContent = "Moins d'infos";
                    } else {
                        e.target.textContent = "Plus d'infos";
                    }
                }
            });
        });
    }

    // Fonction pour peupler les filtres de ville et de type
    function populateFilters() {
        const cities = [...new Set(events.map(event => event.city))].sort();
        cityFilter.innerHTML = '<option value="">Toutes les villes</option>';
        cities.forEach(city => {
            if (city && city.trim() !== '') {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                cityFilter.appendChild(option);
            }
        });

        const types = [...new Set(events.map(event => event.type))].sort();
        typeFilter.innerHTML = '<option value="">Tous les types</option>';
        types.forEach(type => {
            if (type && type.trim() !== '') {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                typeFilter.appendChild(option);
            }
        });
    }

    // Fonction pour filtrer les événements
    function filterEvents() {
        const selectedDateStr = dateFilter.value; // Ceci sera au format YYYY-MM-DD ou vide
        const selectedCity = cityFilter.value;
        const selectedType = typeFilter.value;

        let selectedDateObj = null;
        if (selectedDateStr) {
            selectedDateObj = new Date(selectedDateStr);
            selectedDateObj.setHours(0, 0, 0, 0);
        }

        const filtered = events.filter(event => {
            let matchesDate = true;
            if (selectedDateObj) {
                const eventDateParts = event.date.split('/');
                let eventDateObj = null;
                if (eventDateParts.length === 3) {
                    eventDateObj = new Date(
                        parseInt(eventDateParts[2]),
                        parseInt(eventDateParts[1]) - 1,
                        parseInt(eventDateParts[0])
                    );
                    eventDateObj.setHours(0, 0, 0, 0);
                } else {
                    eventDateObj = new Date(event.date); // Tentez une conversion directe si déjà bon format
                    eventDateObj.setHours(0, 0, 0, 0);
                }

                if (eventDateObj && !isNaN(eventDateObj.getTime())) {
                    matchesDate = eventDateObj.getTime() === selectedDateObj.getTime();
                } else {
                    matchesDate = false;
                }
            }

            const matchesCity = selectedCity ? event.city === selectedCity : true;
            const matchesType = selectedType ? event.type === selectedType : true;

            return matchesDate && matchesCity && matchesType;
        });

        displayEvents(filtered);
    }

    // Fonction pour récupérer les événements depuis le backend Vercel
    async function getEventsFromBackend() {
        try {
            const response = await fetch(BACKEND_API_URL);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}. Détails: ${errorData.error || 'Aucun détail d\'erreur.'}`);
            }
            const eventsFromBackend = await response.json();

            // Mapping des données (correspond aux clés renvoyées par le backend)
            const mappedEvents = eventsFromBackend.map(row => {
                return {
                    id: row.id,
                    date: row.date,
                    name: row.name,
                    location: row.location,
                    city: row.city,
                    type: row.type,
                    link: row.link,
                    description: row.description || ''
                };
            });

            events.length = 0;
            events.push(...mappedEvents);

            populateFilters();
            filterEvents();
            console.log('Événements récupérés du backend Vercel et mis à jour:', events);

        } catch (err) {
            console.error('Erreur lors de la récupération des événements du backend:', err);
            eventsListDiv.innerHTML = `<p class="no-events-message">Impossible de charger les événements. Erreur : ${err.message}. Vérifiez la console pour plus de détails.</p>`;
        }
    }

    // Ajout des écouteurs d'événements pour les filtres
    dateFilter.addEventListener('change', filterEvents);
    cityFilter.addEventListener('change', filterEvents);
    typeFilter.addEventListener('change', filterEvents);

    // Initialisation
    getEventsFromBackend();
});
