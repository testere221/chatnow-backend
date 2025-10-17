// ChatNow Website JavaScript

// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Header background on scroll
    const header = document.querySelector('.header');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.style.background = 'rgba(0, 122, 255, 0.95)';
            header.style.backdropFilter = 'blur(10px)';
        } else {
            header.style.background = 'linear-gradient(135deg, #007AFF, #0056CC)';
            header.style.backdropFilter = 'none';
        }
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });

    // Observe screenshots
    const screenshots = document.querySelectorAll('.screenshot');
    screenshots.forEach(screenshot => {
        screenshot.style.opacity = '0';
        screenshot.style.transform = 'translateY(30px)';
        screenshot.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(screenshot);
    });

    // Mobile menu toggle (if needed)
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }

    // Download button click tracking
    const downloadButtons = document.querySelectorAll('.btn-primary');
    downloadButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Track download button clicks
            console.log('Download button clicked');
            
            // You can add analytics tracking here
            // gtag('event', 'click', {
            //     event_category: 'download',
            //     event_label: 'hero_download_button'
            // });
        });
    });

    // Form validation (if forms are added)
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Basic form validation
            const inputs = form.querySelectorAll('input[required], textarea[required]');
            let isValid = true;
            
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = '#ff4444';
                } else {
                    input.style.borderColor = '#ddd';
                }
            });
            
            if (isValid) {
                // Form is valid, you can submit it
                console.log('Form is valid');
                // Add your form submission logic here
            }
        });
    });

    // Lazy loading for images (if added)
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => {
        imageObserver.observe(img);
    });

    // Add loading animation
    window.addEventListener('load', function() {
        document.body.classList.add('loaded');
    });
});

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Scroll to top function
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Add scroll to top button
window.addEventListener('scroll', debounce(function() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 300) {
        // Show scroll to top button
        if (!document.querySelector('.scroll-to-top')) {
            const scrollBtn = document.createElement('button');
            scrollBtn.className = 'scroll-to-top';
            scrollBtn.innerHTML = '↑';
            scrollBtn.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                background: #007AFF;
                color: white;
                border: none;
                cursor: pointer;
                font-size: 20px;
                z-index: 1000;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            `;
            
            scrollBtn.addEventListener('click', scrollToTop);
            document.body.appendChild(scrollBtn);
        }
    } else {
        // Hide scroll to top button
        const scrollBtn = document.querySelector('.scroll-to-top');
        if (scrollBtn) {
            scrollBtn.remove();
        }
    }
}, 100));
