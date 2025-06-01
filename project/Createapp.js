(async function () {
    console.log('🚀 Amazon Apply Bot started...');

    async function clickElement(element) {
        if (!element) return false;

        // Check if the element is actually interactable
        const isInteractable = () => {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
                rect.width > 0 &&
                rect.height > 0 &&
                style.visibility !== 'hidden' &&
                style.display !== 'none' &&
                !element.disabled
            );
        };

        // Wait up to 3s for it to become interactable
        for (let i = 0; i < 30; i++) {
            if (isInteractable()) break;
            await new Promise(r => setTimeout(r, 100));
        }

        if (!isInteractable()) {
            console.warn('⚠️ Element not interactable:', element);
            return false;
        }

        try {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await new Promise(r => requestAnimationFrame(r));

            element.click(); // Try native click first

            // Dispatch synthetic-like React event chain
            ['mouseover', 'mousedown', 'mouseup', 'click'].forEach(type =>
                element.dispatchEvent(new MouseEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }))
            );

            if (element.focus) element.focus();
            console.log('✅ Clicked element successfully');
            return true;
        } catch (err) {
            console.error('❌ Failed to click:', err);
            return false;
        }
    }

    function waitForElement(selectorFn, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const interval = 100;
            let waited = 0;
            const check = () => {
                const el = selectorFn();
                if (el) return resolve(el);
                if (waited >= timeout) return reject(new Error('⏳ Timeout waiting for element'));
                waited += interval;
                setTimeout(check, interval);
            };
            check();
        });
    }

    async function handleJobDetailPage() {
        console.log('📄 On jobDetail page');

        try {
            const dropdown = await waitForElement(() =>
                document.querySelector('[data-test-component="StencilReactRow"].jobDetailScheduleDropdown')
            );
            console.log('⏬ Clicking schedule dropdown...');
            await clickElement(dropdown);

            const card = await waitForElement(() => {
                const cards = document.querySelectorAll('[data-test-component="StencilReactCard"][role="button"]');
                return cards.length ? cards[Math.min(2, cards.length - 1)] : null;
            });
            console.log('📅 Clicking schedule card...');
            await clickElement(card);

            await new Promise(res => setTimeout(res, 400)); // Wait for Apply button to become active

            const applyBtn = await waitForElement(() =>
                document.querySelector('[data-test-id="jobDetailApplyButtonDesktop"]')
            );
            console.log('🖱️ Found Apply button:', applyBtn);

            const clicked = await clickElement(applyBtn);
            if (!clicked) console.error('🚫 Failed to click Apply button');
        } catch (err) {
            console.error('🚫 Error on jobDetail page:', err);
        }
    }

    async function handleApplicationPage() {
        console.log('📝 On application/consent page');

        try {
            const createAppBtn = await waitForElement(() => {
                return [...document.querySelectorAll('button')].find(btn =>
                    btn.textContent?.trim() === 'Create Application' ||
                    btn.querySelector('div[data-test-component="StencilReactRow"]')?.textContent?.trim() === 'Create Application'
                );
            }, 15000);

            console.log('✅ Clicking Create Application button...');
            if (await clickElement(createAppBtn)) {
                setTimeout(() => {
                    console.log('🔄 Redirecting to jobSearch...');
                    window.location.href = 'https://hiring.amazon.ca/app#/jobSearch';
                }, 5000);
            }
        } catch (err) {
            console.error('🚫 Error on application/consent page:', err);
        }
    }

    // Routing logic
    const url = window.location.href;

    if (url.includes('/jobDetail')) {
        await handleJobDetailPage();
    } else if (url.includes('/application/ca/') || url.includes('/consent')) {
        await handleApplicationPage();
    } else {
        console.log('⚠️ Not on a handled page:', url);
    }
})();