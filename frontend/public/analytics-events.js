/**
 * July Life Coach — Google Analytics Custom Event Tracking
 * Auto-tracks clicks on key outbound actions across all pages.
 * 
 * Events sent to GA4:
 *   - calendly_click       → Calendly booking links
 *   - stripe_click         → Stripe buy links (book purchases)
 *   - practice_app_click   → Practice App links
 *   - coaching_cta_click   → Coaching / business coaching page CTAs
 *   - services_cta_click   → Services page section link clicks
 *   - portfolio_click      → Portfolio project links
 *   - email_link_click     → mailto links
 *   - guide_cta_click      → Buddhist practice guide CTAs
 *   - convertkit_form_view → ConvertKit form appeared on page
 *   - outbound_click       → Any other external link
 */

(function () {
    // Wait for gtag to be available
    function track(eventName, params) {
        if (typeof gtag === 'function') {
            gtag('event', eventName, params);
        }
    }

    // Track all link clicks via delegation
    document.addEventListener('click', function (e) {
        const link = e.target.closest('a');
        if (!link) return;

        const href = link.href || '';
        const text = (link.textContent || '').trim().slice(0, 80);
        const page = window.location.pathname;

        // Calendly booking links
        if (href.includes('calendly.com')) {
            track('calendly_click', {
                link_url: href,
                link_text: text,
                page_location: page,
            });
            return;
        }

        // Stripe buy links
        if (href.includes('buy.stripe.com')) {
            track('stripe_click', {
                link_url: href,
                link_text: text,
                page_location: page,
            });
            return;
        }

        // Practice App links
        if (href.includes('practice.julylifecoach.com')) {
            track('practice_app_click', {
                link_url: href,
                link_text: text,
                page_location: page,
            });
            return;
        }

        // Coaching page CTAs
        if (href.includes('/coaching.html') || href.includes('/business-coaching.html')) {
            track('coaching_cta_click', {
                link_url: href,
                link_text: text,
                page_location: page,
            });
            return;
        }

        // Services page section links (from homepage)
        if (href.includes('services.julylifecoach.com') || href.includes('/services.html')) {
            track('services_cta_click', {
                link_url: href,
                link_text: text,
                page_location: page,
            });
            return;
        }

        // Portfolio project links (on services page)
        if (link.closest('.portfolio-card') || link.classList.contains('portfolio-card')) {
            track('portfolio_click', {
                link_url: href,
                link_text: text,
                page_location: page,
            });
            return;
        }

        // Buddhist practice guide CTA
        if (href.includes('here.julylifecoach.com') || href.includes('/buddhist-practice-guide.html') || link.classList.contains('cta-button')) {
            track('guide_cta_click', {
                link_url: href,
                link_text: text,
                page_location: page,
            });
            return;
        }

        // Email links
        if (href.startsWith('mailto:')) {
            track('email_link_click', {
                link_url: href,
                page_location: page,
            });
            return;
        }

        // Any other external link
        if (link.hostname && link.hostname !== window.location.hostname) {
            track('outbound_click', {
                link_url: href,
                link_text: text,
                page_location: page,
            });
        }
    });

    // Track ConvertKit form appearance
    // ConvertKit injects forms async, so we watch for them
    const ckObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            m.addedNodes.forEach(function (node) {
                if (node.nodeType === 1) {
                    // ConvertKit forms have data-sv-form attribute or formkit class
                    if (node.querySelector && (node.querySelector('[data-sv-form]') || node.querySelector('.formkit-form'))) {
                        track('convertkit_form_view', {
                            page_location: window.location.pathname,
                        });
                    }
                    if (node.getAttribute && (node.getAttribute('data-sv-form') || (node.classList && node.classList.contains('formkit-form')))) {
                        track('convertkit_form_view', {
                            page_location: window.location.pathname,
                        });
                    }
                }
            });
        });
    });

    ckObserver.observe(document.body, { childList: true, subtree: true });

    // Track scroll depth milestones (25%, 50%, 75%, 100%)
    var scrollMilestones = {};
    window.addEventListener('scroll', function () {
        var scrollPercent = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
        );
        [25, 50, 75, 100].forEach(function (milestone) {
            if (scrollPercent >= milestone && !scrollMilestones[milestone]) {
                scrollMilestones[milestone] = true;
                track('scroll_depth', {
                    percent: milestone,
                    page_location: window.location.pathname,
                });
            }
        });
    });
})();
