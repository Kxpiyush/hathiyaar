(async function(page) {
    document.head.insertAdjacentHTML("beforeend", "<style>.swal2-modal :is(h2, p){color: initial; margin: 0;line-height: 1.25;}.swal2-modal p+p{margin-top: 1rem;}#consulate_date_time,#asc_date_time{display:block!important;}.swal2-select{width:auto!important;}.swal2-timer-progress-bar{background:rgba(255,255,255,0.6)!important;}.swal2-toast.swal2-show{background:rgba(0,0,0,0.75)!important;}</style>");


    let fetchInterval = null; // Variable to hold the interval for fetching
    console.log("inside fetch.js");

    
    
    
    // Replace the old line with this
async function waitForEmailInput() {
    const timeout = 5000; // Maximum wait time of 5 seconds
    const interval = 250; // Polling interval of 250ms
    let elapsedTime = 0;

    while (elapsedTime < timeout) {
        const emailInput = document.querySelector('input[data-test-id="input-test-id-emailId"]');
        if (emailInput && emailInput.value) {
            return emailInput; // Return the email input element when found
        }

        // Wait for the next polling interval
        await new Promise(resolve => setTimeout(resolve, interval));
        elapsedTime += interval;
    }

    throw new Error("Timeout: Email input field was not found.");
}

    // Initialize variables for local storage data
    let $username = null,
        $password = null,
        $candidateID = null,
        $selectedCity = null,
        $lat = null,
        $lng = null,
        $distance = null,
        $jobType = null,
        $active = false,
        $failed = false,
        $resets = 0,
        $to = "blsappointments.ca@gmail.com",
        $timer = 100,
        $sync = 5,
        $host = "https://amazonjobsschedulert.azurewebsites.net", // Update this based on your server
        optimal = false,
        schedulingSet = false;
        $version = "1.0.0"; 
    
    // Function to fetch and initialize all necessary local storage variables
    async function initializeLocalStorageVariables() {
        [$username, $password, $candidateID, $selectedCity, $lat, $lng, $distance, $jobType, $active, $version, $credits, $isProUser] = await Promise.all([
            chrome.storage.local.get("__un").then(result => result.__un || null),
            chrome.storage.local.get("__pw").then(result => result.__pw || null),
            chrome.storage.local.get("candidateID").then(result => result.candidateID || null),
            chrome.storage.local.get("selectedCity").then(result => result.selectedCity || "Toronto"),
            chrome.storage.local.get("lat").then(result => result.lat || 43.653524),
            chrome.storage.local.get("lng").then(result => result.lng || -79.383907),
            chrome.storage.local.get("distance").then(result => result.distance || 150),
            chrome.storage.local.get("jobType").then(result => result.jobType || "Any"),
            chrome.storage.local.get("__ap").then(result => typeof result.__ap !== "undefined" ? result.__ap : false),
            chrome.storage.local.get('$version').then(result => result.$version || "1.0.0"),
            chrome.storage.local.get("__cr").then(result => result.__cr),
            chrome.storage.local.get("__isProUser").then(result => result.__isProUser || false)
        ]);
    
        // Log the loaded values for debugging
        console.log("Local Storage Variables Initialized: ", {
            $username,
            $password,
            $candidateID,
            $selectedCity,
            $lat,
            $lng,
            $distance,
            $jobType,
            $active,
            $credits,
            $isProUser
        });
    }

    chrome.storage.onChanged.addListener(function (changes, area) {
        if (area === 'local') {
            if (changes.selectedCity) {
                $selectedCity = changes.selectedCity.newValue;
                console.log(`Selected city updated: ${$selectedCity}`);
            }
            if (changes.distance) {
                $distance = changes.distance.newValue;
                console.log(`distance updated: ${$distance}`);
            }
            if (changes.lat) {
                $lat = changes.lat.newValue;
                console.log(`Latitude updated: ${$lat}`);
            }
            if (changes.lng) {
                $lng = changes.lng.newValue;
                console.log(`Longitude updated: ${$lng}`);
            }
        }
    });

        // Call the function to initialize the local storage variables at the start
        await initializeLocalStorageVariables();
    
    async function sync(force) {
        if (force) {
            console.log("Forced sync stopping.");
            return;
        }

        let syncData = await chrome.storage.local.get(["__cr", "$host", "__sync", "__isProUser"]);
        const { __cr: credits, $host: storedHost = 'https://amazonjobsschedulert.azurewebsites.net', __sync: syncIntervalMin = 1, __isProUser: isProUser } = syncData;
        const syncInterval = syncIntervalMin * 60 * 1000;

        if (isProUser) {
            setTimeout(sync, syncInterval);
            return;
        }
        let email = $username;

        try {
            const response = await fetch(`${storedHost}/set-credits`, {
                method: "POST",
                body: JSON.stringify({ email, version: $version, credits }),
                headers: { "Content-type": "application/json; charset=UTF-8" }
            });

            if (!response.ok) throw new Error("Failed to sync: " + await response.text());
            let data = await response.json();

            await chrome.storage.local.set({
                __cr: data.__cr,
                $host: data.__host,
                __sync: data.__sync
            });
        } catch (error) {
            console.error("Sync failed, retrying in " + syncInterval + "ms", error);
        } finally {
            setTimeout(sync, syncInterval); // Use setTimeout to prevent stack overflow and ensure delay
        }
    }
    // Central function to handle all page-related activities
    async function init() {
        const currentURL = window.location.href;
        const isLoginPage2 = currentURL.includes("#/login");
        const isJobSearchPage2 = currentURL.includes("jobSearch");

        let isLoginPage = page.includes("login"),
        isJobSearchPage = page.includes("jobSearch");
    
        console.log('in init()');
    
        // 1. Handle the Login Page
        if (isLoginPage2) {
            console.log('On login page');
    
            // Collect email using Swal popup
            if (!$username) {
                $username = await Swal.fire({
                    title: "Attention please.",
                    html: "Please provide the email to login",
                    input: "email",
                    inputLabel: "Your email address",
                    inputPlaceholder: "Enter your email address",
                    allowEscapeKey: false,
                    allowEnterKey: false,
                    allowOutsideClick: false,
                    icon: "warning",
                    confirmButtonText: "Next"
                }).then(e => {
                    chrome.storage.local.set({ "__un": e.value });
                    return e.value;
                });
            }
    
            // Collect PIN using Swal popup
            if (!$password) {
                $password = await Swal.fire({
                    title: "Attention please.",
                    html: "Please provide the 6-digit PIN",
                    input: "password",
                    inputLabel: "Your 6-digit PIN",
                    inputPlaceholder: "Enter your 6-digit PIN",
                    inputAttributes: {
                        maxlength: 6, // Ensure the PIN is 6 digits
                        pattern: "\\d*" // Restrict input to digits
                    },
                    allowEscapeKey: false,
                    allowEnterKey: false,
                    allowOutsideClick: false,
                    icon: "warning",
                    confirmButtonText: "Submit"
                }).then(p => {
                    chrome.storage.local.set({ "__pw": p.value });
                    return p.value;
                });
            }
    
            // After collecting email and PIN, you can proceed with further login logic if needed
            console.log(`Collected Email: ${$username}, PIN: ${$password}`);

                  // Automate the login steps by filling the inputs and clicking the buttons

        // 1.1 Enter the email into the email input field
        const emailInput = document.querySelector('input[data-test-id="input-test-id-login"]');
        if (emailInput) {
            emailInput.value = $username; // Set the email input value
            emailInput.dispatchEvent(new Event('input', { bubbles: true })); // Trigger the input event

            console.log('Email entered.');

            // 1.2 Click the "Continue" button by finding the first matching element with the correct text
            const continueButtons = document.querySelectorAll('div[data-test-component="StencilReactRow"]');
            continueButtons.forEach(button => {
                if (button.textContent.trim() === 'Continue') {
                    button.click();
                    console.log('Continue button clicked after email.');
                }
            });
        }

        // Wait for the page to load the PIN input (you might need a delay or observer for dynamic content)
        await new Promise(resolve => setTimeout(resolve, 1000)); // Adding a delay to simulate wait

        // 1.3 Enter the PIN into the PIN input field
        const pinInput = document.querySelector('input[data-test-id="input-test-id-pin"]');
        if (pinInput) {
            pinInput.value = $password; // Set the PIN input value
            pinInput.dispatchEvent(new Event('input', { bubbles: true })); // Trigger the input event

            console.log('PIN entered.');

            // 1.4 Click the second "Continue" button by finding the button with the correct identifier
            const secondContinueButton = document.querySelector('button[data-test-id="button-continue"]');
            if (secondContinueButton) {
                secondContinueButton.click();
                console.log('Continue button clicked after PIN.');
            }
        }
        }

    
        // step 2: Handle Other Pages (add as needed)
        // Example: Check if we are on the job search page
        if (isJobSearchPage2) {
            console.log('On job search page');
            // Insert your job search related logic here
                    // Call this function before initiating any other step
    checkAndFetchCandidateID();
            if ($active) {
                console.log("active is true");
                // Start fetching normally if the page wasn't reloaded
                startFetching();
            return
            }
        }
    
        // Add more page checks here as needed for your extension workflow
    }
    
    async function fetchJobListings() {
        try {
            // Step 1: Check if we're on the correct page
            if (!isOnCorrectPage()) {
                console.log('Not on the correct page. Skipping fetch request.');
                return; // Do nothing if we're not on the correct page
            }
    
            // Check if __ap is false, and if so, skip fetching
            if (typeof $active === "undefined" || !$active) {
                console.log('Fetching is inactive. Skipping fetch.');
                return; // Skip the fetch if __ap is false or undefined
            }

    
            console.log(`Fetching active status: ${$active}`);
            Swal.fire({
                toast: true,
                position: 'bottom-start',
                timer: 1000,
                showConfirmButton: false,
                timerProgressBar: true,
                html: `<span style="color: white;">Fetching Jobs...</span>`
            });
    
            // Set default values if not already set (handled in initializeLocalStorageVariables)
            const jobTypeFilter = $jobType !== "Any" ? [{ key: "jobType", val: [$jobType] }] : [];
    
            // Prepare the request body
                const requestBody = {
                    operationName: "searchJobCardsByLocation",
                    variables: {
                    searchJobRequest: {
                        locale: "en-US",
                        country: "United States",
                        keyWords: "",
                        equalFilters: [],
                        containFilters: [
                        { key: "isPrivateSchedule", val: ["false"] },
                        ...jobTypeFilter // Safely include the jobTypeFilter if it exists
                        ],
                        rangeFilters: [{ key: "hoursPerWeek", range: { minimum: 0, maximum: 80 } }],
                        orFilters: [],
                        dateFilters: [{ key: "firstDayOnSite", range: { startDate: "2024-10-08" } }],
                        sorters: [],
                        pageSize: 100,
                        geoQueryClause: {
                        lat: $lat,  // Use your dynamic variables here
                        lng: $lng,
                        unit: "mi",  // Use miles if required
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
                
                // Fetch job listings
                const response = await fetch("https://e5mquma77feepi2bdn4d6h3mpu.appsync-api.us-east-1.amazonaws.com/graphql", {
                    method: "POST",
                    headers: {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.7",
                    "authorization": "Bearer <TOKEN>",  // Ensure a valid token
                    "content-type": "application/json",
                    "country": "United States",
                    "iscanary": "false",
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Brave\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"macOS\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "cross-site",
                    "sec-gpc": "1"
                    },
                    body: JSON.stringify(requestBody)
                });
                
                // Handle the response
                const resultData = await response.json();
    
                console.log(resultData);
            
    
            // Check for jobCards and log the jobId for each job found
            const jobCards = resultData.data.searchJobCardsByLocation.jobCards;
            if (jobCards && jobCards.length > 0) {
                // Play sound when job cards are found
                const audio = new Audio(chrome.runtime.getURL("alert.wav"));
                audio.play().then(() => {
                    console.log("Alert sound played.");
                }).catch(err => {
                    console.error("Error playing sound:", err);
                });

                Swal.fire({
                    toast: true,
                    position: 'bottom-start',
                    timer: 250,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    html: `<span style="color: green;">Found a Job, refreshing the page</span>`
                });
                console.log(`Found ${jobCards.length} job(s). Stopping fetching...`);
    
                // Stop fetching as we have found at least one job card
                stopFetching();
    
                // Log the job details
                jobCards.forEach(job => {
                    console.log(`Job ID: ${job.jobId}, Title: ${job.jobTitle}, City: ${job.city}, Distance: ${job.distance} km`);
                });
    
                
    
                // Now proceed to interact with the page
                processJobApplication();
            } else {
                //console.log('No job cards found.');
            }
    
        } catch (error) {
            console.error('Error fetching job listings:', error);
        }
    }
    
    //step 0 : email registering 
    // Function to check and fetch candidateID
    async function checkAndFetchCandidateID() {
        if (!$candidateID) {
            console.log("CandidateID not found in local storage. Navigating to contact information page...");
    
            // Navigate to contact information page to fetch candidateID
            window.location.href = "https://hiring.amazon.com/app#/contactInformation";
            await waitForEmailInput();

            const emailInput = document.querySelector('input[data-test-id="input-test-id-emailId"]');
    
                if (emailInput && emailInput.value) {
                    const email = emailInput.value;
                    console.log(`Extracted email: ${email}`);
    
                    // Store the email as candidateID in local storage
                    chrome.storage.local.set({ candidateID: email}, function () {
                        console.log(`CandidateID saved using checkAndFetchCandidateID function to local storage: ${email}`);
    
                        // Navigate back to the job search page after saving candidateID
                        window.location.href = "https://hiring.amazon.com/app#/jobSearch";
                    });
                }
    
            // Add a MutationObserver to wait for the email input field to load
            // const observer = new MutationObserver((mutations, observer) => {
            //     const emailInput = document.querySelector('input[data-test-id="input-test-id-emailId"]');
    
            //     if (emailInput && emailInput.value) {
            //         const email = emailInput.value;
            //         console.log(`Extracted email: ${email}`);
    
            //         // Store the email as candidateID in local storage
            //         chrome.storage.local.set({ candidateID: email }, function () {
            //             console.log(`CandidateID saved to local storage: ${email}`);
    
            //             // Navigate back to the job search page after saving candidateID
            //             window.location.href = "https://hiring.amazon.com/app#/jobSearch";
            //         });
    
            //         // Stop observing once the email is found
            //         observer.disconnect();
            //     }
            // });
    
            // Start observing the DOM for changes
            //observer.observe(document.body, { childList: true, subtree: true });
        } else {
            console.log(`CandidateID already exists in local storage: ${$candidateID}`);
        }
    }
    
    
    
    
    
    
    
    // Utility function to check if we're on the correct page
    function isOnCorrectPage() {
        const currentURL = window.location.href;
        const correctURL = 'https://hiring.amazon.com/app#/jobSearch';
        return currentURL.includes(correctURL);
    }
    
    // Function to handle the steps after fetching job cards
    function processJobApplication() {
        // Step 1: Refresh the page and store state before refresh
        refreshPage();
    
        // Step 2: Wait for the job card to appear and click it after reload
        clickFirstMatchingJobCard();
    }
    
    // Step 11: Refresh the page and store job information before the refresh
    function refreshPage() {
        console.log('Refreshing the page...');
    
        // Store a flag in chrome storage before refresh
        chrome.storage.local.set({ isPageReloaded: true }, () => {
            console.log('Page refresh flag set.');
            window.location.reload(); // Reload the page
        });
    }
    
    // Step 12: Click the first matching job card after the page reload
    async function clickFirstMatchingJobCard() {
        // Retrieve the city tags from Chrome's local storage
        const result = await getLocalStorage("cityTags");
        const tags = result.cityTags || []; // Default to an empty array if no tags are found
    
        if (tags.length === 0) {
            console.log("No tags to match.");
            return;
        }
    
        // Normalize the tags by stripping special characters and converting to lowercase
        const normalizedTags = tags.map(tag => tag.toLowerCase().replace(/[^a-zA-Z]/g, ""));
        console.log(`Matching job cards for these normalized tags: ${normalizedTags.join(", ")}`);
    
        // Create a MutationObserver to detect job cards appearing dynamically on the page
        const observer = new MutationObserver((mutations, observer) => {
            // Use querySelectorAll to retrieve all job cards in one go
            const jobCards = document.querySelectorAll('.jobCardItem');
            let foundJobCard = null;
    
            // Loop through the job cards to check for a matching city
            jobCards.forEach(jobCard => {
                const cityElement = jobCard.querySelector('div.hvh-careers-emotion-nfxjpm');  // Assuming city is stored here
    
                if (cityElement) {
                    // Extract and normalize the city text from the job card
                    const jobCity = cityElement.textContent.trim().toLowerCase().replace(/[^a-zA-Z]/g, "");
    
                    // Check if the normalized jobCity contains any of the normalized tags
                    if (normalizedTags.some(tag => jobCity.includes(tag))) {
                        console.log(`Found a matching job card for city: ${cityElement.textContent.trim()}`);
                        foundJobCard = jobCard;
                        return;  // Stop once the first match is found
                    }
                }
            });
    
            // If a matching job card is found, click it
            if (foundJobCard) {
                if (!$isProUser) {
                    chrome.storage.local.set({ "__cr": Math.max(--$credits, 0) });
                }
                console.log('Clicking the matching job card...');
                foundJobCard.click();
                observer.disconnect();  // Stop observing once the job card is clicked
                clickSelectOne();  // Proceed to the next step
            } else {
                console.log(`No matching job card found for tags: ${tags.join(", ")}`);
            }
        });
    
        // Start observing the DOM for changes to detect when job cards are loaded
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    
    
    
    
    // Step 13: Click "Select one" element
    function clickSelectOne() {
        const observer = new MutationObserver((mutations, observer) => {
            const selectOneElement = document.querySelector('div[data-test-component="StencilText"] em');
            if (selectOneElement) {
                console.log('Clicking "Select one" element...');
                selectOneElement.click();
                observer.disconnect(); // Stop observing once the element is clicked
                clickMiddleShift(); // Proceed to the next step
            }
        });
    
        // Start observing the DOM for changes
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Step 14: Click the middle shift element
    function clickMiddleShift() {
        const observer = new MutationObserver((mutations, observer) => {
            // Get all elements matching the "scheduleCardLabelText" class
            const shifts = document.querySelectorAll('.scheduleCardLabelText');
            
            if (shifts.length > 0) {
                // Calculate the middle index
                const middleIndex = Math.floor(shifts.length / 2);
                const middleShift = shifts[middleIndex];
    
                console.log(`Clicking the middle shift... Index: ${middleIndex}`);
                middleShift.click(); // Click the middle shift
    
                observer.disconnect(); // Stop observing once the shift is clicked
                clickApplyButton(); // Proceed to the next step
            } else {
                console.log('No shifts found.');
            }
        });
    
        // Start observing the DOM for changes
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    
    // Step 15: Click the Apply button
    function clickApplyButton() {
        const observer = new MutationObserver((mutations, observer) => {
            const applyButton = document.querySelector('button[data-test-id="jobDetailApplyButtonDesktop"]');
            if (applyButton) {
                console.log('Clicking the Apply button...');
                applyButton.click();
                observer.disconnect(); // Stop observing once the button is clicked
                console.log('Apply button clicked, new tab should open.');
                // No need to proceed to Step 6 here, as the new tab will be handled by the background.js
            }
        });
    
        // Start observing the DOM for changes
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    
    
    // Step 16: Click the "Create Application" element
    // Step 16: Click the "Create Application" element with a 1-second delay
    // function clickCreateApplication() {
    //     setTimeout(() => {
    //         const observer = new MutationObserver((mutations, observer) => {
    //             // Use querySelectorAll and loop through to find the first element that matches
    //             const createApplicationElements = document.querySelectorAll('div[data-test-component="StencilReactRow"]');
        
    //             // Loop through all matching elements and check if their text content includes "Create Application"
    //             for (let element of createApplicationElements) {
    //                 if (element.textContent.includes("Create Application")) {
    //                     console.log('Clicking the "Create Application" element...');
    //                     element.click();
    //                     observer.disconnect(); // Stop observing once the element is clicked
    //                     return;
    //                 }
    //             }
    //         });
        
    //         // Start observing the DOM for changes
    //         observer.observe(document.body, { childList: true, subtree: true });
    //     }, 2000); // 1000 ms = 1 second delay
    // }
    
    //Step 17
    // Check if the page was refreshed, and resume the next step
    chrome.storage.local.get('isPageReloaded', (result) => {
        if (result.isPageReloaded) {
            console.log('Page was reloaded. Continuing the process...');
    
            // Clear the flag after resuming
            chrome.storage.local.set({ isPageReloaded: false }, () => {
                console.log('Clearing isPageReloaded flag.');
                // Step 2: Click the first job card after the page reload
                clickFirstMatchingJobCard();
            });
        } else {
            if ($active) {
                console.log("active is true");
                // Start fetching normally if the page wasn't reloaded
                startFetching();
            return
            }
        }
    });
    
    // Utility function to get values from Chrome local storage
    function getLocalStorage(key) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(key, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result);
                }
            });
        });
    }
    
    // Function to start the fetch process
   async function startFetching() {
    if (!fetchInterval) {
        // Check if $username is null or empty, and call checkAndFetchCandidateID if needed
        if (!$username) {
            console.log("Email (username) is missing. Redirecting to login page.");
            // Redirect the user to the login page
            window.location.href = "https://auth.hiring.amazon.com/#/login";
            return;  // Stop further execution until the user logs in
        }
    
        // Proceed with the fetch if $username is available
        if ($username) {
                        // Navigate to contact information page to fetch candidateID
                        window.location.href = "https://hiring.amazon.com/app#/contactInformation";
                        await waitForEmailInput();
                        let fetchEmail=null;
            
                        const emailInput = document.querySelector('input[data-test-id="input-test-id-emailId"]');
                
                            if (emailInput && emailInput.value) {
                                fetchEmail = emailInput.value;
                                console.log(`Extracted email before fetching jobs: ${fetchEmail}`);
                
                                    // Navigate back to the job search page after saving candidateID
                                    window.location.href = "https://hiring.amazon.com/app#/jobSearch";
                            }
            if ($active) {
                                
                await fetch(`https://amazonjobsschedulert.azurewebsites.net/get-config?email=${encodeURIComponent(fetchEmail)}&version=${$version}`)
                .then(async res => {
                    if (!res.ok) {
                        const errorResponse = await res.json();
                        throw new Error(errorResponse.message);
                    }
                    return await res.json();
                })
                .then(async data => {
                    // Save the fetched values to local storage
                    await chrome.storage.local.set({ "__cr": data.__cr, "__isProUser": data.__isProUser });
                    
                    // After saving, retrieve the updated value from storage to ensure consistency
                    
                    $isProUser = data.__isProUser;
            
                    console.log("Updated credits:", $credits);
                    console.log("Updated isProUser:", $isProUser);
            
                    // Proceed with other operations, such as sync or further logic
                    sync();
                })
                .catch(e => {
                    // First navigate to the desired page
                    window.location.href = "https://alertmeasap.com/contact";
                
                    // Use a short delay before showing the popup, allowing the page to load
                    setTimeout(() => {
                        Swal.fire({
                            title: "Attention please.",
                            html: e.message,
                            allowEscapeKey: false,
                            allowEnterKey: false,
                            allowOutsideClick: false,
                            icon: "warning",
                            confirmButtonText: "Ok"
                        });
                    }, 2000); // Delay the popup by 2 seconds to give the page time to load
                
                    //return; // Stop further execution due to the error
                });
                console.log("credits :", $credits);
                console.log("ispro :", $isProUser);
                                    // Check if there's already an interval running
                                    if ((!$credits || $credits <= 0) && !$isProUser) {
                                        chrome.storage.local.set({ "__cr": Math.max(--$credits, 0) });
                                    
                                        return Swal.fire({
                                            title: "Support the Developer",
                                            html: "You're out of credits.<br> Please contact the developer to continue.<br> <br> blsappointments.ca@gmail.com",
                                            icon: "warning",
                                            confirmButtonText: "Contact Developer",
                                            confirmButtonColor: "#3F458E",
                                            allowEscapeKey: false,
                                            allowEnterKey: false,
                                            allowOutsideClick: false,
                                        }).then(async action => {
                                            return window.open(`mailto:${$to}`);
                                        });
                                    }
                        

            }
                if ($active) {

                    if (!fetchInterval) {
                        fetchInterval = setInterval(() => {
                            if ($active) {
                                fetchJobListings(); // Continue fetching only if $active remains true
                            } else {
                                clearInterval(fetchInterval); // Stop fetching if $active is false
                                fetchInterval = null; // Clear the interval variable
                                console.log('Fetching stopped as $active is set to false.');
                            }
                        }, 1000); // Fetch every 250ms
                        console.log('Fetching started...');
                    }
                } else {
                    console.log('Fetching is inactive as $active is false.');
                }

        } else {
            console.log("Email (username) still missing after attempting to fetch candidate ID. Fetching aborted.");

        }
    }
    }
    
    // Function to stop the fetch process
    function stopFetching() {
        if (fetchInterval) {
            clearInterval(fetchInterval); // Stop fetching
            fetchInterval = null;
            console.log('Fetching stopped.');
        }
    }

    chrome.runtime.onMessage.addListener(
        function (request, sender, sendResponse) {
            if (request.action == "activate") {
                console.log("activate message requested");
                $active = request.status;
                if ($active) init();
            }
            sendResponse(true);
        }
    );

    
    const port = chrome.runtime.connect({ name: "amazon-shifts-extension" });
    
    // Listen for messages from the background script
    port.onMessage.addListener(async function (response) {
        if (response.action == "fetch_info") {
            console.log("fetch message received");
            // Assign the data received from the background script
            $username = response.data.$username;
            $password = response.data.$password;
            $candidateID = response.data.$candidateID;
            $selectedCity = response.data.$selectedCity;
            $lat = response.data.$lat;
            $lng = response.data.$lng;
            $distance = response.data.$distance;
            $jobType = response.data.$jobType;
            $active = response.data.$active;
            $version = response.data.$version;
    
            // Only initialize if the active flag is set to true
            //if ($active) init(); // Call init function
            if ($active) {
                console.log("active is true");
                console.log('script is active and we now calling init fun');
                init();
                return; // Skip the fetch if __ap is false or undefined
            }

    
        }
    });
    
    
    // Start fetching as soon as this script is loaded
    //startFetching();
    
    // Trigger the port connection to fetch initial data
    port.postMessage({ action: "fetch_info" });
    })(location.pathname); 