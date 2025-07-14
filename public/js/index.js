document.addEventListener('DOMContentLoaded', function() {
  const stockImages = [
    'images/Home Page/Stock/lucas-george-wendt-JVVlF-MwwX0-unsplash.jpg',
    'images/Home Page/Stock/md-duran-ymlCmg1WHS4-unsplash.jpg',
    'images/Home Page/Stock/melody-ayres-griffiths-OPT2JopTERY-unsplash.jpg',
    'images/Home Page/Stock/salah-darwish-oiJYwZu_x-c-unsplash.jpg',
    'images/Home Page/Stock/hailegebrael-berhanu-FccGZaynH4o-unsplash.jpg'
  ];
  let idxTop = 0;
  let idxBottom = 1; // Start offset by 1 so they're never the same at first

  const topSection = document.querySelector('.main-section-top');
  const bottomSection = document.querySelector('.main-section-bottom');
  if (!topSection || !bottomSection) return;

  function setBackgrounds() {
    // Top section cross-fade
    topSection.style.setProperty('--next-bg', `url('${stockImages[idxTop]}')`);
    topSection.classList.add('fade-bg');
    // bottom section cross-fade
    bottomSection.style.setProperty('--next-bg', `url('${stockImages[idxBottom]}')`);
    bottomSection.classList.add('fade-bg');
    setTimeout(() => {
      topSection.style.backgroundImage = `url('${stockImages[idxTop]}')`;
      topSection.classList.remove('fade-bg');
      bottomSection.style.backgroundImage = `url('${stockImages[idxBottom]}')`;
      bottomSection.classList.remove('fade-bg');
      // Advance both indexes, but skip if they would be the same
      idxTop = (idxTop + 1) % stockImages.length;
      idxBottom = (idxBottom + 1) % stockImages.length;
      if (idxBottom === idxTop) {
        idxBottom = (idxBottom + 1) % stockImages.length;
      }
    }, 2000); // Match transition duration
  }

  // Set up the cross-fade effect using CSS variable for both sections
  const style = document.createElement('style');
  style.innerHTML = `
    .main-section-top.fade-bg::after,
    .main-section-bottom.fade-bg::after {
      background-image: var(--next-bg);
      opacity: 0.432;
    }
  `;
  document.head.appendChild(style);

  setBackgrounds();
  setInterval(setBackgrounds, 7000);

  // Brand carousel logic
  const brandImages = [
    'images/Home Page/Brands/Crystal Black.png',
    'images/Home Page/Brands/Crystal Purple.png',
    'images/Home Page/Brands/Kettle.png',
    'images/Home Page/Brands/Oxford Gold.png',
    'images/Home Page/Brands/Kifaru Black.png',
    'images/Home Page/Brands/Kifaru Purple.png',
    'images/Home Page/Brands/Royal Black.png',
    'images/Home Page/Brands/Royal Red.png'
    // Add all your brand image filenames here
  ];
  const carouselTrack = document.querySelector('.brand-carousel-track');
  if (carouselTrack) {
    // Duplicate images for seamless scroll
    const imagesHtml = brandImages.concat(brandImages).map(src =>
      `<img src="${src}" alt="Brand logo" class="brand-logo">`
    ).join('');
    carouselTrack.innerHTML = imagesHtml;
  }

  // featured product carousel logic 
  const productCarouselTrack = document.querySelector('.featured-product-track');
  if (productCarouselTrack) {
    fetch('/api/featured-products')
      .then(res => res.json())
      .then(featuredProducts => {
        if (featuredProducts && featuredProducts.length) {
          // Duplicate for seamless scroll
          const doubled = featuredProducts.concat(featuredProducts);
          const imagesHtml = doubled.map(product =>
            `<a href="product.html?id=${encodeURIComponent(product.id)}">
               <img src="${product.imageUrl}" alt="Featured Product" class="featured-product">
             </a>`
          ).join('');
          productCarouselTrack.innerHTML = imagesHtml;
        }
      });
  }
  // Banner Pictures Rotator
  const bannerImages = [
    'images/Home Page/Banner/1.png',
    'images/Home Page/Banner/2.png',
    'images/Home Page/Banner/3.png',
    'images/Home Page/Banner/4.png',
    'images/Home Page/Banner/5.png'
    // Add more images as needed
  ];
  let bannerIdx = 0;
  const bannerImg = document.getElementById('banner-image');
  if (bannerImg && bannerImages.length > 1) {
    // Add smooth transition via CSS
    bannerImg.style.transition = 'opacity 1s cubic-bezier(.4,0,.2,1)';
    bannerImg.style.willChange = 'opacity';

    setInterval(() => {
      bannerImg.style.opacity = 0;
      setTimeout(() => {
        bannerIdx = (bannerIdx + 1) % bannerImages.length;
        bannerImg.src = bannerImages[bannerIdx];
        // Wait for image to load before fading in
        bannerImg.onload = () => {
          bannerImg.style.opacity = 1;
        };
      }, 600); // fade out before changing (slightly longer for smoother effect)
    }, 4000); // change every 4 seconds
  }
});