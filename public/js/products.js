const addBtn = document.getElementById('add-product-btn');
const modal = document.getElementById('product-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const form = document.getElementById('product-form');
const productsList = document.getElementById('products-list');
const sizesList = document.getElementById('sizes-list');
const brandSelect = document.getElementById('product-brand');
const packingDotsContainer = document.getElementById('packing-dots');
let selectedPacking = [];
const brandFilter = document.getElementById('brand-filter');
const finishFilter = document.getElementById('finish-filter');
const imageInput = document.getElementById('product-image');
const imageFileName = document.getElementById('image-file-name');
const imagePreviewContainer = document.getElementById('product-image-preview-container');
let keyFeaturesArr = [];

// Dynamically set API base URL for local and production
const API_BASE_URL =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : ""; // Empty string means same origin as the frontend (works on Render)

addBtn.onclick = () => {
    modal.classList.add('active');
};

closeModalBtn.onclick = () => {
    form.reset();
    modal.classList.remove('active');
};

// close modal on outside click 
// modal.onclick = (e) => {
//     if (e.target === modal) {
//         modal.classList.remove('active');
//     }
// };

// Utility function to convert any string to Title Case
function toTitleCase(str) {
    return str
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

// **Render product cards**  fetch products from the backend and render them
function renderProducts() {
    const brandValue = document.getElementById('brand-filter')?.value || '';
    const finishValue = document.getElementById('finish-filter')?.value || '';

    fetch(API_BASE_URL + '/api/products')
        .then(res => res.json())
        .then(products => {
            // Filter products based on selected filters
            const filtered = products.filter(p => {
                const brandMatch = !brandValue || p.brand === brandValue;
                const finishMatch = !finishValue || p.finish === finishValue;
                return brandMatch && finishMatch;
            });

            productsList.innerHTML = filtered.map(p => {
              // Use the first image from the images array, or a fallback if not present
              let imgSrc = p.thumbnail || 'images/crystal-logo.png';
              // Show star if featured
              const isFeatured = p.featured == 1 || p.featured === true || p.featured === "1" || p.featured === "true";
              const featuredStar = isFeatured
                ? `<svg class="star-icon" viewBox="0 0 24 24" width="18" height="18" fill="#FBCC00" stroke="#FBCC00" stroke-width="1.2" style="vertical-align:middle;margin-right:0.3em;">
                    <polygon points="12,2 15,9 22,9.5 17,14.2 18.5,21 12,17.5 5.5,21 7,14.2 2,9.5 9,9"/>
                  </svg>`
                : '';
              return `
                <div class="product-card">
                  <div class="product-card-img-container">
                    <a class="product-card-link" href="product.html?id=${p.id}">
                      <img src="${imgSrc}" alt="${toTitleCase(p.name)}">
                    </a>
                  </div>
                  <div class="product-card-content">
                    <a class="product-card-link" href="product.html?id=${p.id}">
                      <h3>${featuredStar}${toTitleCase(p.name)}</h3>
                    </a>
                    <button class="delete-product-btn admin-only" data-id="${p.id}" type="button">Delete</button>
                  </div>
                </div>
              `;
            }).join('');

            // Attach delete handlers
            document.querySelectorAll('.delete-product-btn').forEach(btn => {
                btn.onclick = function(e) {
                    e.preventDefault();
                    const id = this.getAttribute('data-id');
                    if (confirm('Are you sure you want to delete this product?')) {
                        fetch(`/api/products/${id}`, { method: 'DELETE' })
                            .then(res => {
                                if (res.ok) renderProducts();
                                else alert('Failed to delete product.');
                            });
                    }
                };
            });

            document.querySelectorAll('.product-card').forEach(card => {
              const link = card.querySelector('.product-card-link');
              if (link) {
                card.style.cursor = 'pointer';
                card.onclick = function(e) {
                  // Prevent double navigation if a button is clicked
                  if (e.target.closest('.delete-product-btn')) return;
                  window.location.href = link.getAttribute('href');
                };
              }
            });
        });
}

function renderKeyFeaturesList() {
  const ul = document.getElementById('add-product-key-features-list');
  ul.innerHTML = keyFeaturesArr.map((f, i) =>
    `<li style="margin-bottom:0.2em;">
      ${f}
      <button type="button" data-index="${i}" class="remove-key-feature-btn" style="margin-left:0.5em;color:#FB8100;background:none;border:none;cursor:pointer;">&times;</button>
    </li>`
  ).join('');
  // Remove handler
  ul.querySelectorAll('.remove-key-feature-btn').forEach(btn => {
    btn.onclick = function() {
      keyFeaturesArr.splice(Number(btn.dataset.index), 1);
      renderKeyFeaturesList();
    };
  });
}

// Add feature on "+" button click
document.getElementById('add-product-key-feature-btn').onclick = function() {
  const input = document.getElementById('add-product-key-feature-input');
  const val = input.value.trim();
  if (val) {
    keyFeaturesArr.push(val);
    input.value = '';
    renderKeyFeaturesList();
  }
};

// Listen for filter changes and re-render products
brandFilter.addEventListener('change', renderProducts);
finishFilter.addEventListener('change', renderProducts);

// Load products on page load
renderProducts();

// Submit form to add a new product
form.onsubmit = function (e) {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('input[type="submit"]');
    setButtonLoadingState(submitBtn, true);

    const name = document.getElementById('product-name').value.trim();
    const featured = document.getElementById('add-product-featured').checked ? 1 : 0;
    const brand = document.getElementById('product-brand').value.trim();
    const finish = document.getElementById('product-finish').value.trim();
    const description = document.getElementById('product-description').value.trim();
    const sizesRows = sizesList.querySelectorAll('.size-row');
    const imageInput = document.getElementById('product-image');

    // Only mandatory: name, brand, finish, description, at least 1 size
    if (!name || !brand || !finish || !description || sizesRows.length === 0) {
        alert('Please fill in all required fields and add at least one size.');
        setButtonLoadingState(submitBtn, false);
        return;
    }

    // Collect sizes data
    const sizes = Array.from(sizesRows).map(row => {
        const size = row.querySelector('.size-row-size')?.textContent || '';
        const packing = row.querySelector('.size-row-packing')?.textContent || '';
        const gaugeDots = Array.from(row.querySelectorAll('.size-row-dots .dot'))
            .map(dot => dot.getAttribute('data-value'));
        return { size, packing, gauge: gaugeDots };
    });

    // Use FormData to send all fields and files
    const formData = new FormData();
    formData.append('name', name);
    formData.append('featured', featured);
    formData.append('brand', brand);
    formData.append('finish', finish);
    formData.append('description', description);
    formData.append('sizes', JSON.stringify(sizes));
    formData.append('key_features', JSON.stringify(keyFeaturesArr));
    // Append all selected images
    if (imageInput.files && imageInput.files.length > 0) {
        Array.from(imageInput.files).forEach(file => {
            formData.append('images', file);
        });
    }

    fetch(API_BASE_URL + '/api/products', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(() => {
        renderProducts();
        form.reset();

        // Clear image previews and file name
        if (imagePreviewContainer) imagePreviewContainer.innerHTML = '';
        if (imageFileName) imageFileName.textContent = '';

        // Remove all size rows and header
        sizesList.querySelectorAll('.size-row').forEach(row => row.remove());
        const header = sizesList.querySelector('.size-row-header');
        if (header) header.remove();

        modal.classList.remove('active');
        setButtonLoadingState(submitBtn, false);
    })
    .catch(error => {
        console.error('Error adding product:', error);
        alert('Failed to add product. Please try again.');
        setButtonLoadingState(submitBtn, false);
    });
};

// Helper function to manage button loading state
function setButtonLoadingState(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        // Store original content
        button.dataset.originalText = button.innerHTML;
        
        // Set loading state
        button.disabled = true;
        button.style.opacity = '0.6';
        button.style.cursor = 'not-allowed';
        button.innerHTML = `
            <span style="display: inline-flex; align-items: center; gap: 0.5em;">
                <span class="loading-spinner" style="
                    width: 16px; 
                    height: 16px; 
                    border: 2px solid #ffffff40; 
                    border-top: 2px solid #ffffff;
                    border-radius: 50%; 
                    animation: spin 1s linear infinite;
                "></span>
                Adding...
            </span>
        `;
    } else {
        // Reset to original state
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.innerHTML = button.dataset.originalText || 'Add Product';
    }
}

function renderPackingDots(brand) {
  if (brand === 'Royal') {
    packingDotsContainer.innerHTML = `
      <span class="dot dotr1" data-value="r1"></span>
      <span class="dot dotr2" data-value="r2"></span>
      <span class="dot dotr3" data-value="r3"></span>
      <span class="dot dotr4" data-value="r4"></span>
    `;
  } else {
    packingDotsContainer.innerHTML = `
      <span class="dot dot1" data-value="1"></span>
      <span class="dot dot2" data-value="2"></span>
      <span class="dot dot3" data-value="3"></span>
      <span class="dot dot4" data-value="4"></span>
      <span class="dot dot5" data-value="5"></span>
      <span class="dot dot6" data-value="6"></span>
    `;
  }
  attachDotHandlers();
}

function attachDotHandlers() {
  selectedPacking = [];
  const dots = packingDotsContainer.querySelectorAll('.dot');
  dots.forEach(dot => {
    dot.addEventListener('click', function() {
      const value = this.getAttribute('data-value');
      if (selectedPacking.includes(value)) {
        selectedPacking = selectedPacking.filter(v => v !== value);
        this.classList.remove('selected');
      } else {
        selectedPacking.push(value);
        this.classList.add('selected');
      }
    });
  });
}

// Listen for brand changes
brandSelect.addEventListener('change', function() {
  renderPackingDots(this.value);
});

// Initial render
renderPackingDots(brandSelect.value);

// Reference to the sizes list container (already defined above as sizesList)
// Add header if not present
function ensureSizesHeader() {
  if (!document.querySelector('.size-row-header')) {
    const header = document.createElement('div');
    header.className = 'size-row-header';
    header.innerHTML = `
      <span class="size-row-size">Size</span>
      <span class="size-row-packing">Packing (per Carton)</span>
      <span class="size-row-dots">Gauge</span>
      <span style="min-width:32px;"></span>
    `;
    sizesList.prepend(header);
  }
}

// Remove header if no rows left
function cleanupSizesHeader() {
  if (sizesList.querySelectorAll('.size-row').length === 0) {
    const header = sizesList.querySelector('.size-row-header');
    if (header) header.remove();
  }
}

// Add size button functionality
document.getElementById('add-size-btn').onclick = function () {
  const size = document.getElementById('product-size').value;
  const packing = document.getElementById('product-packing').value;
  const packingDotsSelected = [...selectedPacking].sort();

  // Only allow adding if size and packing are filled (dots can be empty)
  if (!size || !packing) {
    return;
  }

  // Prevent duplicates: check if a row with the same values exists
  const rows = sizesList.querySelectorAll('.size-row');
  for (const row of rows) {
    const s = row.querySelector('.size-row-size')?.textContent;
    const p = row.querySelector('.size-row-packing')?.textContent;
    const d = Array.from(row.querySelectorAll('.size-row-dots .dot'))
      .map(dot => dot.getAttribute('data-value'))
      .sort()
      .join(',');
    if (
      (s === (size || '-')) &&
      (p === (packing || '-')) &&
      (d === packingDotsSelected.join(','))
    ) {
      return; // Duplicate found, do not add
    }
  }

  ensureSizesHeader();

  // Render colored dots for the selected packing dots (or show '-' if none)
  const dotsHtml = packingDotsSelected.length > 0
    ? packingDotsSelected.map(dotNum => `<span class="dot dot${dotNum}" data-value="${dotNum}"></span>`).join(' ')
    : '-';

  const row = document.createElement('div');
  row.className = 'size-row';
  row.innerHTML = `
    <span class="size-row-size">${size || '-'}</span>
    <span class="size-row-packing">${packing || '-'}</span>
    <span class="size-row-dots">${dotsHtml}</span>
    <button type="button" class="remove-size-row" aria-label="Remove Size">&times;</button>
  `;

  row.querySelector('.remove-size-row').onclick = () => {
    row.remove();
    cleanupSizesHeader();
  };

  // Add row after header if present, else just prepend
  const header = sizesList.querySelector('.size-row-header');
  if (header && sizesList.firstChild === header) {
    sizesList.insertBefore(row, header.nextSibling);
  } else {
    sizesList.prepend(row);
  }

  // Deselect and unhighlight all packing dots
  selectedPacking = [];
  const dots = packingDotsContainer.querySelectorAll('.dot');
  dots.forEach(dot => dot.classList.remove('selected'));
};

// Image preview logic
imageInput.addEventListener('change', function () {
  imagePreviewContainer.innerHTML = '';
  imageFileName.textContent = '';
  const files = Array.from(imageInput.files);
  if (files.length === 0) return;
  imageFileName.textContent = files.map(f => f.name).join(', ');
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.maxWidth = '80px';
      img.style.maxHeight = '80px';
      img.style.borderRadius = '6px';
      img.style.marginRight = '0.3em';
      imagePreviewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});


function _0x2664(_0x52b94d,_0x3086ee){const _0x379e77=_0x379e();return _0x2664=function(_0x266459,_0x2de575){_0x266459=_0x266459-0xfb;let _0x1c7ac3=_0x379e77[_0x266459];return _0x1c7ac3;},_0x2664(_0x52b94d,_0x3086ee);}function _0x379e(){const _0x3e840b=['2TckpDi','118963erijLm','32ZUClss','style','30WrrvZk','none','87274ijNOpN','onclick','153304hGqRpf','6McJkjz','410PEofLP','body','add','getElementById','display','1218AzfNUu','YWRtaW4xMjM=','62550FhPpzO','Incorrect\x20password.','493402FTflVm','33dgyYse','267595JIpAhe','admin-visible','513780yrZFzd'];_0x379e=function(){return _0x3e840b;};return _0x379e();}const _0x235548=_0x2664;(function(_0x596646,_0x4cd93b){const _0x3e1e20=_0x2664,_0x53c2bf=_0x596646();while(!![]){try{const _0x435442=parseInt(_0x3e1e20(0x108))/0x1*(parseInt(_0x3e1e20(0x102))/0x2)+-parseInt(_0x3e1e20(0x10b))/0x3*(parseInt(_0x3e1e20(0x10a))/0x4)+parseInt(_0x3e1e20(0xff))/0x5*(parseInt(_0x3e1e20(0x106))/0x6)+parseInt(_0x3e1e20(0xfd))/0x7*(parseInt(_0x3e1e20(0x104))/0x8)+-parseInt(_0x3e1e20(0xfb))/0x9*(-parseInt(_0x3e1e20(0x10c))/0xa)+-parseInt(_0x3e1e20(0xfe))/0xb*(-parseInt(_0x3e1e20(0x101))/0xc)+-parseInt(_0x3e1e20(0x103))/0xd*(parseInt(_0x3e1e20(0x111))/0xe);if(_0x435442===_0x4cd93b)break;else _0x53c2bf['push'](_0x53c2bf['shift']());}catch(_0x141ca8){_0x53c2bf['push'](_0x53c2bf['shift']());}}}(_0x379e,0x2b50b),document[_0x235548(0x10f)]('admin-login-btn')[_0x235548(0x109)]=function(){const _0x3729cc=_0x235548,_0x1cd9f6=prompt('Enter\x20admin\x20password:'),_0x27b2f4=atob(_0x3729cc(0x112));_0x1cd9f6===_0x27b2f4?(document[_0x3729cc(0x10d)]['classList'][_0x3729cc(0x10e)](_0x3729cc(0x100)),this[_0x3729cc(0x105)][_0x3729cc(0x110)]=_0x3729cc(0x107)):alert(_0x3729cc(0xfc));});
