(async function () {
    console.log('🚀 Amazon Apply Bot started...');

    async function clickElement(element) {
        if (!element) return false;

        try {
            // Scroll element into view
            element.scrollIntoView({ behavior: 'auto', block: 'center' });
            await new Promise(r => setTimeout(r, 50)); // Small delay for scroll

            // Try multiple click approaches
            const clickMethods = [
                () => element.click(),
                () => element.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                })),
                () => {
                    const rect = element.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    element.dispatchEvent(new MouseEvent('click', {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                        clientX: centerX,
                        clientY: centerY
                    }));
                }
            ];

            // Try each click method until one works
            for (const method of clickMethods) {
                try {
                    method();
                    console.log('✅ Click successful');
                    return true;
                } catch (err) {
                    continue;
                }
            }

            return false;
        } catch (err) {
            console.error('❌ Click failed:', err);
            return false;
        }
    }

    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (typeof selector === 'function') {
                const element = selector();
                if (element) {
                    return resolve(element);
                }
            }

            const observer = new MutationObserver((mutations, obs) => {
                const element = typeof selector === 'function' ? selector() : document.querySelector(selector);
                if (element) {
                    obs.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error('Timeout waiting for element'));
            }, timeout);
        });
    }

    async function handleJobDetailPage() {
        console.log('📄 On jobDetail page');

        try {
            // Click schedule dropdown faster
            const dropdown = await waitForElement('[data-test-component="StencilReactRow"].jobDetailScheduleDropdown', 3000);
            if (!dropdown) throw new Error('Schedule dropdown not found');
            
            await clickElement(dropdown);
            await new Promise(r => setTimeout(r, 100)); // Short delay for animation

            // Get all schedule cards and select one randomly
            const cards = await waitForElement(() => 
                document.querySelectorAll('[data-test-component="StencilReactCard"][role="button"]')
            );
            
            if (!cards || cards.length === 0) throw new Error('No schedule cards found');
            
            // Select random card
            const randomIndex = Math.floor(Math.random() * cards.length);
            const selectedCard = cards[randomIndex];
            
            await clickElement(selectedCard);
            await new Promise(r => setTimeout(r, 100)); // Short delay for UI update

            // Enhanced Apply button clicking with href capture
            const applyBtn = await waitForElement(() => {
                const btn = document.querySelector('[data-test-id="jobDetailApplyButtonDesktop"]');
                return btn && !btn.disabled ? btn : null;
            }, 3000);

            if (!applyBtn) throw new Error('Apply button not found or still disabled');

            // Force enable the button if needed
            if (applyBtn.disabled) {
                applyBtn.disabled = false;
                applyBtn.classList.remove('disabled');
            }

            // Get the application URL before clicking
            const applicationUrl = applyBtn.getAttribute('data-application-url') || 
                                 applyBtn.getAttribute('href') ||
                                 document.querySelector('a[href*="/application/ca/"]')?.href;

            if (applicationUrl) {
                // Open the application URL in a new tab
                window.open(applicationUrl, '_blank');
                console.log('✅ Opened application in new tab');
            } else {
                // Fallback to normal click if URL not found
                const clicked = await clickElement(applyBtn);
                if (!clicked) throw new Error('Failed to click Apply button');
            }

            console.log('✅ Successfully handled Apply button');
        } catch (err) {
            console.error('🚫 Error on jobDetail page:', err);
        }
    }

    async function handleApplicationPage() {
        console.log('📝 On application/consent page');

        try {
            // Wait longer for the Create Application button and try multiple selectors
            const createAppBtn = await waitForElement(() => {
                // Try multiple selector strategies
                return (
                    document.querySelector('button[data-test-id*="create-application"]') ||
                    document.querySelector('div[role="button"]:has-text("Create Application")') ||
                    Array.from(document.querySelectorAll('button, div[role="button"]'))
                        .find(el => el.textContent?.trim() === 'Create Application' ||
                                  el.querySelector('div')?.textContent?.trim() === 'Create Application')
                );
            }, 5000);

            if (!createAppBtn) throw new Error('Create Application button not found');

            console.log('✅ Found Create Application button, clicking...');
            await clickElement(createAppBtn);

            // Redirect faster
            setTimeout(() => {
                console.log('🔄 Redirecting to jobSearch...');
                window.location.href = 'https://hiring.amazon.ca/app#/jobSearch';
            }, 2000);
        } catch (err) {
            console.error('🚫 Error on application/consent page:', err);
            // Fallback: try to find the button again with a different strategy
            try {
                const allButtons = document.querySelectorAll('button, div[role="button"]');
                for (const btn of allButtons) {
                    if (btn.textContent?.includes('Create Application')) {
                        await clickElement(btn);
                        break;
                    }
                }
            } catch (fallbackErr) {
                console.error('🚫 Fallback also failed:', fallbackErr);
            }
        }
    }

    // Enhanced routing logic with URL validation
    const url = window.location.href;
    console.log('📍 Current URL:', url);

    if (url.includes('/jobDetail')) {
        await handleJobDetailPage();
    } else if (url.includes('/application/ca/') || url.includes('/consent')) {
        await handleApplicationPage();
    } else {
        console.log('⚠️ Not on a handled page:', url);
    }
})();