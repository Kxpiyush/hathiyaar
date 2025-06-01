document.addEventListener('DOMContentLoaded', async function() {
    const version = await new Promise(resolve => chrome.management.getSelf(x => resolve(x.version)));
    document.getElementById('version').innerText = '(version v' + version + ')';

    const cityCoordinates = {
        'Acheson': { lat: 53.548701, lng: -113.76261 },
        'Ajax': { lat: 43.850814, lng: -79.020296 },
        'Balzac': { lat: 51.212985, lng: -114.007862 },
        'Bolton': { lat: 43.875473, lng: -79.734437 },
        'Brampton': { lat: 43.685271, lng: -79.759924 },
        'Calgary': { lat: 51.045113, lng: -114.057141 },
        'Cambridge': { lat: 43.361621, lng: -80.314429 },
        'Concord': { lat: 43.80011, lng: -79.48291 },
        'Dartmouth': { lat: 44.67134, lng: -63.57719 },
        'Edmonton': { lat: 53.54545, lng: -113.49014 },
        'Etobicoke': { lat: 43.65421, lng: -79.56711 },
        'Hamilton': { lat: 43.25549, lng: -79.873376 },
        'Mississauga': { lat: 43.58882, lng: -79.644378 },
        'Nisku': { lat: 53.337845, lng: -113.531304 },
        'Ottawa': { lat: 45.425226, lng: -75.699963 },
        'Rocky View': { lat: 51.18341, lng: -113.93527 },
        'Scarborough': { lat: 43.773077, lng: -79.257774 },
        'Sidney': { lat: 48.650629, lng: -123.398604 },
        'ST. Thomas': { lat: 42.777414, lng: -81.182973 },
        'Stoney Creek': { lat: 43.21681, lng: -79.76633 },
        'Toronto': { lat: 43.653524, lng: -79.383907 },
        'Vancouver': { lat: 49.261636, lng: -123.11335 },
        'Vaughan': { lat: 43.849270138, lng: -79.535136594 },
        'Whitby': { lat: 43.897858, lng: -78.943434 },
        'Windsor': { lat: 42.317438, lng: -83.035225 }
    };

    const defaultCities = [
        'Bolton', 'Brampton', 'Burnaby', 'Cambridge',
        'Concord', 'Toronto', 'Sidney'
    ];

    // Load saved settings
    const savedSettings = await chrome.storage.local.get([
        'selectedCity',
        'distance',
        'jobType',
        '__ap',
        'cityTags'
    ]);

    const selectedCity = savedSettings.selectedCity || 'Toronto';
    const distance = savedSettings.distance || '5';
    const jobType = savedSettings.jobType || 'Any';
    const isActive = savedSettings.__ap || false;
    const cityTags = savedSettings.cityTags || [];

    // Initialize UI elements
    const citySelect = document.getElementById('city');
    const distanceSelect = document.getElementById('distance');
    const workHoursSelect = document.getElementById('work_hours');
    const activateToggle = document.getElementById('activate');

    if (citySelect) citySelect.value = selectedCity;
    if (distanceSelect) distanceSelect.value = distance;
    if (workHoursSelect) workHoursSelect.value = jobType;
    if (activateToggle) activateToggle.checked = isActive;

    // Set coordinates for selected city
    const { lat, lng } = cityCoordinates[selectedCity];
    chrome.storage.local.set({ lat, lng });

    // Event listeners
    citySelect.addEventListener('change', function() {
        const city = this.value;
        const { lat, lng } = cityCoordinates[city];
        chrome.storage.local.set({
            selectedCity: city,
            lat,
            lng
        });
    });

    distanceSelect.addEventListener('change', function() {
        chrome.storage.local.set({ distance: this.value });
    });

    workHoursSelect.addEventListener('change', function() {
        chrome.storage.local.set({ jobType: this.value });
    });

    activateToggle.addEventListener('change', async function() {
        chrome.storage.local.set({ '__ap': this.checked });
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        chrome.tabs.sendMessage(tab.id, {
            action: 'activate',
            status: this.checked
        });
    });

    // Reset functionality
    document.getElementById('ais_visa_info').addEventListener('submit', async function(e) {
        e.preventDefault();
        const resetButton = document.getElementById('reset_info');
        resetButton.setAttribute('disabled', 'disabled');
        
        await chrome.storage.local.clear();
        await chrome.storage.local.set({
            '__ap': true,
            'selectedCity': 'Toronto',
            'lat': 43.653524,
            'lng': -79.383907,
            'distance': '5',
            'jobType': 'Any'
        });

        resetButton.classList.toggle('btn-success');
        resetButton.innerText = 'Success';
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        resetButton.classList.toggle('btn-success');
        resetButton.removeAttribute('disabled');
        resetButton.innerText = 'Reset';
    });

    // Tutorial button
    document.getElementById('tutorial').addEventListener('click', function() {
        chrome.tabs.create({ url: 'https://youtu.be/17iWkjXwRJs' });
    });

    // Tag management functions
    function addTag(tag, skipStorage = false) {
        const tagBox = document.getElementById('tag-input-box');
        const tagElement = document.createElement('div');
        tagElement.classList.add('tag');
        tagElement.innerHTML = tag + ' <span class="remove-tag">x</span>';
        
        tagBox.insertBefore(tagElement, document.getElementById('city-input'));
        document.getElementById('clear-all').style.display = 'inline';
        
        tagElement.querySelector('.remove-tag').addEventListener('click', function() {
            removeTag(this);
        });

        if (!skipStorage) {
            saveTag(tag);
        }
    }

    function removeTag(element) {
        const tag = element.parentElement;
        const tagText = tag.textContent.trim().slice(0, -1);
        tag.remove();
        removeTagFromStorage(tagText);
        
        if (!document.querySelector('.tag')) {
            document.getElementById('clear-all').style.display = 'none';
        }
    }

    function saveTag(tag) {
        chrome.storage.local.get('cityTags', function(result) {
            let tags = result.cityTags || [];
            tags.push(tag);
            chrome.storage.local.set({ cityTags: tags });
        });
    }

    function removeTagFromStorage(tag) {
        chrome.storage.local.get('cityTags', function(result) {
            let tags = result.cityTags || [];
            tags = tags.filter(t => t.trim().toLowerCase() !== tag.trim().toLowerCase());
            chrome.storage.local.set({ cityTags: tags });
        });
    }

    function clearAllTags() {
        const tags = document.querySelectorAll('.tag');
        tags.forEach(tag => tag.remove());
        chrome.storage.local.remove('cityTags');
        document.getElementById('clear-all').style.display = 'none';
    }

    // Initialize tags
    function loadTags() {
        chrome.storage.local.get('cityTags', function(result) {
            const tags = result.cityTags || defaultCities;
            tags.forEach(tag => addTag(tag, true));
        });
    }

    // Event listeners for tag management
    document.getElementById('clear-all').addEventListener('click', clearAllTags);
    
    document.getElementById('city-input').addEventListener('keyup', function(e) {
        if (e.key === 'Enter' && this.value.trim() !== '') {
            addTag(this.value.trim());
            this.value = '';
        }
    });

    loadTags();
});