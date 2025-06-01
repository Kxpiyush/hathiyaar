(async function(page) {
    document.head.insertAdjacentHTML("beforeend", "<style>.swal2-modal :is(h2, p){color: initial; margin: 0;line-height: 1.25;}.swal2-modal p+p{margin-top: 1rem;}#consulate_date_time,#asc_date_time{display:block!important;}.swal2-select{width:auto!important;}.swal2-timer-progress-bar{background:rgba(255,255,255,0.6)!important;}.swal2-toast.swal2-show{background:rgba(0,0,0,0.75)!important;}</style>");

    let fetchInterval = null;
    const c = 250; // Fetch interval in milliseconds

    // Initialize variables
    let $username = null,
        $password = null,
        $candidateID = null,
        $selectedCity = null,
        $lat = 43.653524,
        $lng = -79.383907,
        $distance = 5,
        $jobType = null,
        $active = false;

    // Function to fetch and initialize all necessary local storage variables
    async function initializeLocalStorageVariables() {
        [$username, $password, $candidateID, $selectedCity, $lat, $lng, $distance, $jobType, $active] = await Promise.all([
            chrome.storage.local.get("__un").then(result => result.__un || null),
            chrome.storage.local.get("__pw").then(result => result.__pw || null),
            chrome.storage.local.get("candidateID").then(result => result.candidateID || null),
            chrome.storage.local.get("selectedCity").then(result => result.selectedCity || "Toronto"),
            chrome.storage.local.get("lat").then(result => result.lat || 43.653524),
            chrome.storage.local.get("lng").then(result => result.lng || -79.383907),
            chrome.storage.local.get("distance").then(result => result.distance || 5),
            chrome.storage.local.get("jobType").then(result => result.jobType || "Any"),
            chrome.storage.local.get("__ap").then(result => typeof result.__ap !== "undefined" ? result.__ap : false)
        ]);
    }

    // Listen for storage changes
    chrome.storage.onChanged.addListener(function(changes, area) {
        if (area === 'local') {
            if (changes.selectedCity) $selectedCity = changes.selectedCity.newValue;
            if (changes.distance) $distance = changes.distance.newValue;
            if (changes.lat) $lat = changes.lat.newValue;
            if (changes.lng) $lng = changes.lng.newValue;
            if (changes.jobType) $jobType = changes.jobType.newValue;
        }
    });

    await initializeLocalStorageVariables();

    // Main initialization function
    async function init() {
        const currentURL = window.location.href;
        const isLoginPage = currentURL.includes("#/login");
        const isJobSearchPage = currentURL.includes("jobSearch");

        if (isLoginPage) {
            console.log('On login page');

            // Collect email if not present
            if (!$username) {
                $username = await Swal.fire({
                    title: "Welcome!",
                    html: "Please enter your email address",
                    input: "email",
                    inputLabel: "Email Address",
                    inputPlaceholder: "Enter your email address",
                    allowEscapeKey: false,
                    allowEnterKey: false,
                    allowOutsideClick: false,
                    confirmButtonText: "Next"
                }).then(result => {
                    chrome.storage.local.set({ "__un": result.value });
                    return result.value;
                });
            }

            // Collect PIN if not present
            if (!$password) {
                $password = await Swal.fire({
                    title: "Almost there!",
                    html: "Please enter your 6-digit PIN",
                    input: "password",
                    inputLabel: "6-digit PIN",
                    inputPlaceholder: "Enter your PIN",
                    inputAttributes: {
                        maxlength: 6,
                        pattern: "\\d*"
                    },
                    allowEscapeKey: false,
                    allowEnterKey: false,
                    allowOutsideClick: false,
                    confirmButtonText: "Submit"
                }).then(result => {
                    chrome.storage.local.set({ "__pw": result.value });
                    return result.value;
                });
            }

            // Auto-fill login form
            const emailInput = document.querySelector('input[data-test-id="input-test-id-login"]');
            if (emailInput) {
                emailInput.value = $username;
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Click continue after email
                const continueButtons = document.querySelectorAll('div[data-test-component="StencilReactRow"]');
                continueButtons.forEach(button => {
                    if (button.textContent.trim() === 'Continue') {
                        button.click();
                    }
                });
            }

            // Wait for PIN input field
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Auto-fill PIN
            const pinInput = document.querySelector('input[data-test-id="input-test-id-pin"]');
            if (pinInput) {
                pinInput.value = $password;
                pinInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Click continue after PIN
                const continueButton = document.querySelector('button[data-test-id="button-continue"]');
                if (continueButton) {
                    continueButton.click();
                }
            }
        }

        if (isJobSearchPage && $active) {
            startFetching();
        }
    }

    // Function to check if we're on the correct page
    function isOnCorrectPage() {
        const currentURL = window.location.href;
        const correctURL = 'https://hiring.amazon.ca/app#/jobSearch';
        return currentURL.includes(correctURL);
    }

    // Main fetch function
    async function fetchJobListings() {
        try {
            if (!isOnCorrectPage() || !$active) {
                return;
            }

            // Show fetching toast
            Swal.fire({
                toast: true,
                position: 'bottom-start',
                timer: c,
                showConfirmButton: false,
                timerProgressBar: true,
                html: `<span style="color: white;">Fetching Jobs...</span>`
            });

            const jobTypeFilter = $jobType !== "Any" ? [{ key: "jobType", val: [$jobType] }] : [];
            const currentDate = new Date().toISOString().split('T')[0];

            // Prepare request body
            const requestBody = {
                operationName: "searchJobCardsByLocation",
                variables: {
                    searchJobRequest: {
                        locale: "en-CA",
                        country: "Canada",
                        keyWords: "",
                        equalFilters: [],
                        containFilters: [
                            { key: "isPrivateSchedule", val: ["false"] },
                            ...jobTypeFilter
                        ],
                        rangeFilters: [{ 
                            key: "hoursPerWeek",
                            range: { minimum: 0, maximum: 80 }
                        }],
                        orFilters: [],
                        dateFilters: [{
                            key: "firstDayOnSite",
                            range: { startDate: currentDate }
                        }],
                        sorters: [],
                        pageSize: 100,
                        geoQueryClause: {
                            lat: $lat,
                            lng: $lng,
                            unit: "km",
                            distance: parseInt($distance)
                        },
                        consolidateSchedule: true
                    }
                },
                query: `query searchJobCardsByLocation($searchJobRequest: SearchJobRequest!) {
                    searchJobCardsByLocation(searchJobRequest: $searchJobRequest) {
                        nextToken
                        jobCards {
                            jobId
                            jobTitle
                            city
                            distance
                        }
                    }
                }`
            };

            // Make the API request
            const response = await fetch("https://e5mquma77feepi2bdn4d6h3mpu.appsync-api.us-east-1.amazonaws.com/graphql", {
                method: "POST",
                headers: {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.7",
                    "authorization": "Bearer <TOKEN>",
                    "content-type": "application/json",
                    "country": "Canada"
                },
                body: JSON.stringify(requestBody)
            });

            const resultData = await response.json();
            const jobCards = resultData.data.searchJobCardsByLocation.jobCards;

            if (jobCards && jobCards.length > 0) {
                // Play alert sound
                const audio = new Audio(chrome.runtime.getURL("alert.wav"));
                audio.play().catch(console.error);

                // Show success toast
                Swal.fire({
                    toast: true,
                    position: 'bottom-start',
                    timer: 250,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    html: `<span style="color: green;">Found Jobs! Processing...</span>`
                });

                stopFetching();
                processJobCards(jobCards);
            }
        } catch (error) {
            console.error('Error fetching job listings:', error);
        }
    }

    // Process found job cards
    async function processJobCards(jobCards) {
        const cityTags = await chrome.storage.local.get("cityTags").then(result => result.cityTags || []);
        
        if (cityTags.length === 0) return;

        const normalizedTags = cityTags.map(tag => tag.toLowerCase().replace(/[^a-zA-Z]/g, ""));
        
        for (const job of jobCards) {
            if (!job.city) continue;
            
            const jobCity = job.city.toLowerCase().replace(/[^a-zA-Z]/g, "");
            if (normalizedTags.some(tag => jobCity.includes(tag))) {
                const jobUrl = `https://hiring.amazon.ca/app#/jobDetail?jobId=${job.jobId}&locale=en-CA`;
                window.location.href = jobUrl;
                break;
            }
        }
    }

    // Start/Stop fetching functions
    function startFetching() {
        if (!fetchInterval && $active) {
            fetchInterval = setInterval(fetchJobListings, c);
        }
    }

    function stopFetching() {
        if (fetchInterval) {
            clearInterval(fetchInterval);
            fetchInterval = null;
        }
    }

    // Message listeners
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "activate") {
            $active = request.status;
            if ($active) init();
        }
        sendResponse(true);
    });

    // Initialize
    if ($active) init();

})(location.pathname);