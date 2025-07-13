document.addEventListener('DOMContentLoaded', () => {
    // L'URL de votre nouvelle fonction backend Vercel.
    const BACKEND_API_URL = 'https://agenda-good.vercel.app/api/events';

    // Suppression de BASE_PLACEHOLDER_IMAGE_URL car nous n'affichons plus d'images.

    let events = []; // Cet array sera rempli par les données du backend

    const eventsListDiv = document.getElementById('events-list');
    const dateFilter = document.getElementById('date-filter');
    const cityFilter = document.getElementById('city-filter');
    const typeFilter = document.getElementById('type-filter');

    // Suppression de la fonction generateEventPlaceholderImage car plus d'images.

    // Fonction pour afficher les événements
    async function displayEvents(filteredEvents) {
        eventsListDiv.innerHTML = ''; // Vide la liste actuelle

        if (filteredEvents.length === 0) {
            eventsListDiv.innerHTML = '<p class="no-events-message">Aucun événement ne correspond à vos critères de recherche.</p>';
            return;
        }

        for (const event of filteredEvents) {
            const eventCard = document.createElement('div');
            eventCard.classList.add('event-card');

            // Formatage de la date pour le carré à gauche
            const eventDate = new Date(event.date);
            const month = eventDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase(); // Ex: DÉC
            const day = eventDate.getDate(); // Ex: 1

            // Création de l'élément de carte avec la nouvelle structure
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
                    ${event.description ? `<button class="toggle-description-btn" data-event-id="${event.id}">Plus d'infos</button>` : ''}
                </div>
            `;
            eventsListDiv.appendChild(eventCard);

            // Si une description existe, ajoutez le conteneur de description juste après la carte
            if (event.description) {
                const descriptionDiv = document.createElement('div');
                descriptionDiv.classList.add('event-description');
                descriptionDiv.id = `description-${event.id}`; // ID pour cibler facilement
                descriptionDiv.innerHTML = `<p>${event.description}</p>`;
                // Insérer la description juste après la carte dans le flux du document
                eventsListDiv.appendChild(descriptionDiv);
            }
        }

        // Ajouter les écouteurs d'événements pour les boutons "Plus d'infos"
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
        // Collecte des villes uniques
        const cities = [...new Set(events.map(event => event.city))].sort();
        cityFilter.innerHTML = '<option value="">Toutes les villes</option>'; // Réinitialise les options
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            cityFilter.appendChild(option);
        });

        // Collecte des types uniques
        const types = [...new Set(events.map(event => event.type))].sort();
        typeFilter.innerHTML = '<option value="">Tous les types</option>'; // Réinitialise les options
        types.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeFilter.appendChild(option);
        });
    }

    // Fonction pour filtrer les événements
    function filterEvents() {
        const selectedDate = dateFilter.value;
        const selectedCity = cityFilter.value;
        const selectedType = typeFilter.value;

        const filtered = events.filter(event => {
            const matchesDate = selectedDate ? event.date === selectedDate : true;
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

            // Mapping des données avec les nouvelles colonnes
            // Rappel du mappage du backend:
            // id: row[1] + row[2] (Nom + Date)
            // photo: ""
            // date: row[2] (Date de l'événement)
            // name: row[1] (Nom de l'événement)
            // location: row[3] (Lieu)
            // city: row[4] (Ville)
            // type: row[5] (Type d'événement)
            // link: row[7] (Lien vers plus d'info)
            // NOUVEAU : description: row[6] (Description de l'événement)
            const mappedEvents = eventsFromBackend.map(row => {
                return {
                    id: row.id,
                    // photo n'est plus nécessaire dans le frontend pour l'affichage
                    date: row.date,
                    name: row.name,
                    location: row.location,
                    city: row.city,
                    type: row.type,
                    link: row.link,
                    description: row.description || '' // Assurez-vous d'avoir la description ici
                };
            });

            // Mettre à jour l'array `events` global
            events.length = 0;
            events.push(...mappedEvents);

            // Mettre à jour les filtres et l'affichage avec les nouvelles données
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

    // Initialisation : récupérer les événements du backend au chargement de la page
    getEventsFromBackend();
});
