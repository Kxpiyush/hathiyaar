(async function () {
    console.log('🚀 Fast Amazon Apply Bot started...');

    // Optimized element waiting with faster polling
    function waitForElement(selector, timeout = 3000) {
        return new Promise((resolve) => {
            const start = Date.now();
            const check = () => {
                const element = typeof selector === 'function' ? selector() : document.querySelector(selector);
                if (element) return resolve(element);
                if (Date.now() - start > timeout) return resolve(null);
                requestAnimationFrame(check);
            };
            check();
        });
    }

    // Fast click implementation
    async function fastClick(element) {
        if (!element) return false;
        try {
            element.scrollIntoView({ block: 'center' });
            element.click();
            element.dispatchEvent(new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            }));
            return true;
        } catch (err) {
            console.error('Click failed:', err);
            return false;
        }
    }

    async function handleJobDetailPage() {
        try {
            // Quick dropdown click
            const dropdown = await waitForElement('[data-test-component="StencilReactRow"].jobDetailScheduleDropdown');
            if (dropdown) await fastClick(dropdown);

            // Get all schedule cards and select randomly
            const cards = await waitForElement(() => {
                const elements = document.querySelectorAll('[data-test-component="StencilReactCard"][role="button"]');
                return elements.length ? elements : null;
            });

            if (cards) {
                const randomCard = cards[Math.floor(Math.random() * cards.length)];
                await fastClick(randomCard);
            }

            // Quick apply button handling
            const applyBtn = await waitForElement('[data-test-id="jobDetailApplyButtonDesktop"]');
            if (!applyBtn) return;

            // Get application URL before clicking
            const applicationUrl = applyBtn.getAttribute('href') || 
                                 document.querySelector('a[href*="/application/ca/"]')?.href;

            if (applicationUrl) {
                window.open(applicationUrl, '_blank');
            } else {
                await fastClick(applyBtn);
            }
        } catch (err) {
            console.error('Error on job detail page:', err);
        }
    }

    async function handleApplicationPage() {
        try {
            // Fast button finding
            const createAppBtn = await waitForElement(() => {
                return document.querySelector('button[data-test-id*="create-application"]') ||
                       Array.from(document.querySelectorAll('button')).find(btn => 
                           btn.textContent?.includes('Create Application'));
            });

            if (createAppBtn) {
                await fastClick(createAppBtn);
                setTimeout(() => {
                    window.location.href = 'https://hiring.amazon.ca/app#/jobSearch';
                }, 1000);
            }
        } catch (err) {
            console.error('Error on application page:', err);
        }
    }

    // Quick route handling
    const url = window.location.href;
    if (url.includes('/jobDetail')) {
        await handleJobDetailPage();
    } else if (url.includes('/application/ca/') || url.includes('/consent')) {
        await handleApplicationPage();
    }
})();