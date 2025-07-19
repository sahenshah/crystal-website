function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function renderProduct(product) {
  currentProductData = product;
  const container = document.getElementById('product-detail');
  if (!product) {
    container.innerHTML = '<p>Product not found.</p>';
    return;
  }

  // --- Fix: Ensure product.sizes is always an array ---
  if (typeof product.sizes === 'string') {
    try {
      product.sizes = JSON.parse(product.sizes);
    } catch {
      product.sizes = [];
    }
  }

  // Helper to render a single dot if present in gauge
  function renderGaugeDot(gaugeArr, dotValue, dotClass) {
    if (!Array.isArray(gaugeArr)) return '';
    return gaugeArr.includes(dotValue)
      ? `<span class="dot ${dotClass}" data-value="${dotValue}"></span>`
      : '';
  }

  // Build sizes table HTML with a single "Gauge" header spanning the 6 dot columns
  const sizesTable = Array.isArray(product.sizes) && product.sizes.length > 0
    ? `<table class="product-detail-card-sizes-table">
        <thead>
          <tr>
            <th>Size</th>
            <th>Packing (Per Carton)</th>
            <th colspan="6">Gauges Available</th>
          </tr>
        </thead>
        <tbody>
          ${product.sizes.map(size => {
            return `<tr>
              <td>${size.size || '-'}</td>
              <td>${size.packing || '-'}</td>
              <td>${renderGaugeDot(size.gauge, '1', 'dot1') || renderGaugeDot(size.gauge, 'r1', 'dotr1')}</td>
              <td>${renderGaugeDot(size.gauge, '2', 'dot2') || renderGaugeDot(size.gauge, 'r2', 'dotr2')}</td>
              <td>${renderGaugeDot(size.gauge, '3', 'dot3') || renderGaugeDot(size.gauge, 'r3', 'dotr3')}</td>
              <td>${renderGaugeDot(size.gauge, '4', 'dot4') || renderGaugeDot(size.gauge, 'r4', 'dotr4')}</td>
              <td>${renderGaugeDot(size.gauge, '5', 'dot5')}</td>
              <td>${renderGaugeDot(size.gauge, '6', 'dot6')}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`
    : '<p>No sizes available.</p>';

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.image || 'images/crystal-logo.png'];

  container.innerHTML = `
    <div class="product-card product-detail-card">
      <div class="product-detail-main">
        <div class="product-thumbnails">
          ${images.map((img, i) =>
            `<img src="${img}" class="thumbnail-img${i === 0 ? ' selected' : ''}" data-index="${i}" alt="Thumbnail ${i + 1}">`
          ).join('')}
        </div>
        <div id="carousel">
          <div class="carousel-image-wrapper">
          <button id="carousel-left">&#xFFE9;</button>
            ${images.map((img, i) =>
              `<img src="${img}" class="carousel-img${i === 0 ? ' active' : ''}" data-index="${i}" alt="${product.name}">`
            ).join('')}
          <button id="carousel-right">&#xFFEB;</button>
          </div>
        </div>
      </div>
      <div class="product-detail-info">
        <div style="display:flex; align-items:center; gap:0.5em;">
          ${product.featured ? `
            <span class="featured-star" title="Featured Product">
              <svg class="star-icon" viewBox="0 0 24 24" width="28" height="28" fill="#FBCC00" stroke="#FBCC00" stroke-width="1.5">
                <polygon points="12,2 15,9 22,9.5 17,14.2 18.5,21 12,17.5 5.5,21 7,14.2 2,9.5 9,9"/>
              </svg>
            </span>
          ` : ''}
          <h2 style="margin:0;">${product.name}</h2>
        </div>
        <div class="brand-finish">
          <span><b>Brand:</b> ${product.brand}</span> &nbsp; | &nbsp;
          <span><b>Finish:</b> ${product.finish}</span>
        </div>
        <p>${product.description}</p>
        <div>
          <b></b>
          ${sizesTable}
        </div>
      </div>
    </div>
  `;

  // Carousel JS
  const imgs = container.querySelectorAll('.carousel-img');
  let current = 0;
  function showImage(idx) {
    imgs.forEach((img, i) => {
      if (i === idx) img.classList.add('active');
      else img.classList.remove('active');
    });
    // Highlight the selected thumbnail
    container.querySelectorAll('.thumbnail-img').forEach((thumb, i) => {
      if (i === idx) thumb.classList.add('selected');
      else thumb.classList.remove('selected');
    });
    current = idx;
  }
  container.querySelector('#carousel-left').onclick = () => {
    showImage((current - 1 + imgs.length) % imgs.length);
  };
  container.querySelector('#carousel-right').onclick = () => {
    showImage((current + 1) % imgs.length);
  };

  // Thumbnail click handler
  container.querySelectorAll('.thumbnail-img').forEach((thumb, i) => {
    thumb.onclick = () => showImage(i);
  });
}

// Modal for editing product
let currentProductData = null;

function openEditProductModal(product) {
  // Defensive: ensure product.sizes is always an array
  if (typeof product.sizes === 'string') {
    try {
      product.sizes = JSON.parse(product.sizes);
    } catch {
      product.sizes = [];
    }
  }

  const modal = document.getElementById('edit-product-modal');
  modal.classList.add('active');
  // --- Name, Brand, Finish 
  document.getElementById('edit-product-name').value = product.name || '';
  document.getElementById('edit-product-featured').checked = !!product.featured;
  document.getElementById('edit-product-brand').value = product.brand || '';
  document.getElementById('edit-product-finish').value = product.finish || '';
  
  // --- Handle image upload ---
  const imageInput = document.getElementById('edit-product-image');
  const imagePreviewContainer = document.getElementById('edit-image-preview-container');
  const imageFileName = document.getElementById('edit-image-file-name');

  // Show preview of current images stored for product
  imagePreviewContainer.innerHTML = '';
  if (Array.isArray(product.images)) {
    product.images.forEach((imgSrc, idx) => {
      const wrapper = document.createElement('div');
      wrapper.style.display = 'inline-block';
      wrapper.style.position = 'relative';
      wrapper.style.marginRight = '0.5em';

      const img = document.createElement('img');
      img.src = imgSrc;
      img.style.maxWidth = '80px';
      img.style.maxHeight = '80px';
      img.style.borderRadius = '6px';
      img.style.display = 'block';

      // --- Add delete button ---
      const delBtn = document.createElement('button');
      delBtn.textContent = '×';
      delBtn.title = 'Delete image';
      delBtn.style.position = 'absolute';
      delBtn.style.top = '2px';
      delBtn.style.right = '2px';
      delBtn.style.background = 'rgba(0,0,0,0.7)';
      delBtn.style.color = '#fff';
      delBtn.style.border = 'none';
      delBtn.style.borderRadius = '50%';
      delBtn.style.width = '22px';
      delBtn.style.height = '22px';
      delBtn.style.cursor = 'pointer';
      delBtn.style.display = 'flex';
      delBtn.style.alignItems = 'center';
      delBtn.style.justifyContent = 'center';
      delBtn.style.lineHeight = '1';
      delBtn.style.fontSize = '1.2em'; // or adjust as needed
      delBtn.onclick = function(e) {
        e.stopPropagation();
        // Remove the image from product.images
        product.images.splice(idx, 1);
        // Re-render the previews
        // (call the same code block again to update the UI)
        // You may want to extract this preview logic into a function for reuse
        imagePreviewContainer.innerHTML = '';
        product.images.forEach((src, i) => {
          const wrapper = document.createElement('div');
          wrapper.style.display = 'inline-block';
          wrapper.style.position = 'relative';
          wrapper.style.marginRight = '0.5em';

          const img = document.createElement('img');
          img.src = src;
          img.style.maxWidth = '80px';
          img.style.maxHeight = '80px';
          img.style.borderRadius = '6px';
          img.style.display = 'block';

          wrapper.appendChild(img);
          imagePreviewContainer.appendChild(wrapper);
        });
        // Or, simpler: just call openEditProductModal(product) to refresh everything
        openEditProductModal(product);
      };

      wrapper.appendChild(img);
      wrapper.appendChild(delBtn);
      imagePreviewContainer.appendChild(wrapper);
    });
  }

  // --- Preview newly selected images ---
  imageInput.onchange = function () {
    // Remove previous new file previews (but keep current images)
    // Remove all elements with class 'new-image-preview'
    imagePreviewContainer.querySelectorAll('.new-image-preview').forEach(el => el.remove());

    if (imageInput.files && imageInput.files.length > 0) {
      Array.from(imageInput.files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = function (e) {
          const wrapper = document.createElement('div');
          wrapper.className = 'new-image-preview';
          wrapper.style.display = 'inline-block';
          wrapper.style.position = 'relative';
          wrapper.style.marginRight = '0.5em';

          const img = document.createElement('img');
          img.src = e.target.result;
          img.style.maxWidth = '80px';
          img.style.maxHeight = '80px';
          img.style.borderRadius = '6px';
          img.style.display = 'block';
          img.style.opacity = '0.7'; // visually distinguish new images

          wrapper.appendChild(img);
          imagePreviewContainer.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
      });
    }
  };


  // --- Product Description ---
  document.getElementById('edit-product-description').value = product.description || '';

  // --- Sizes Table ---
  const packingDotsContainer = document.getElementById('edit-packing-dots');
  const brandSelect = document.getElementById('edit-product-brand');
  let selectedPacking = [];

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
    // Do not reset selectedPacking here, keep it for add size
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

  // Sizes list
  const sizesList = document.getElementById('edit-sizes-list');
  sizesList.innerHTML = ''; // Clear previous content

  // Add header if there are sizes
  function ensureSizesHeader() {
    if (!sizesList.querySelector('.size-row-header')) {
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

  if (product.sizes && product.sizes.length > 0) {
    ensureSizesHeader();
    product.sizes.forEach(s => {
      const dotsHtml = (s.gauge && s.gauge.length)
        ? s.gauge.map(dotNum => `<span class="dot dot${dotNum}" data-value="${dotNum}"></span>`).join(' ')
        : '-';
      const row = document.createElement('div');
      row.className = 'size-row';
      row.innerHTML = `
        <span class="size-row-size">${s.size || '-'}</span>
        <span class="size-row-packing">${s.packing || '-'}</span>
        <span class="size-row-dots">${dotsHtml}</span>
        <button type="button" class="remove-size-row" aria-label="Remove Size">&times;</button>
      `;
      row.querySelector('.remove-size-row').onclick = () => {
        row.remove();
        // Optionally remove header if no rows left
        if (sizesList.querySelectorAll('.size-row').length === 0) {
          const header = sizesList.querySelector('.size-row-header');
          if (header) header.remove();
        }
      };
      sizesList.appendChild(row);
    });
  }

  // Add size button functionality
  document.getElementById('edit-add-size-btn').onclick = function () {
    const size = document.getElementById('edit-product-size').value;
    const packing = document.getElementById('edit-product-packing').value;
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
      ensureSizesHeader();
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

  // Initial render for current brand
  renderPackingDots(brandSelect.value);

  // Update packing dots on brand change
  brandSelect.addEventListener('change', function() {
    renderPackingDots(this.value);
  });


  document.getElementById('close-edit-modal-btn').onclick = function() {
    modal.classList.remove('active');
  };
  // Close modal on outside click
  // modal.onclick = function(e) {
  //   if (e.target === modal) modal.classList.remove('active');
  // };

  document.getElementById('edit-product-form').onsubmit = function (e) {
    e.preventDefault();

    // Disable the submit button to prevent double/multiple clicks
    const submitBtn = this.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.textContent = 'Saving...';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
      submitBtn.style.pointerEvents = 'none';
    }

    const sizes = Array.from(sizesList.querySelectorAll('.size-row')).map(row => {
      const size = row.querySelector('.size-row-size')?.textContent || '';
      const packing = row.querySelector('.size-row-packing')?.textContent || '';
      const gauge = Array.from(row.querySelectorAll('.size-row-dots .dot')).map(dot => dot.getAttribute('data-value'));
      return { size, packing, gauge };
    });

    // Prepare FormData
    const formData = new FormData();
    formData.set('name', document.getElementById('edit-product-name').value);
    formData.set('featured', document.getElementById('edit-product-featured').checked ? 1 : 0);
    formData.set('brand', document.getElementById('edit-product-brand').value);
    formData.set('finish', document.getElementById('edit-product-finish').value);
    formData.set('description', document.getElementById('edit-product-description').value);
    formData.set('sizes', JSON.stringify(sizes));

    // Add kept image URLs (for images not being replaced)
    formData.set('images', JSON.stringify(Array.isArray(product.images) ? product.images : []));

    // Append new files (if any)
    const imageInput = document.getElementById('edit-product-image');
    if (imageInput.files && imageInput.files.length > 0) {
      Array.from(imageInput.files).forEach(file => {
        formData.append('images', file);
      });
    }

    fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      body: formData
    })
    .then(res => {
      if (res.ok) {
        modal.classList.remove('active');
        window.location.href = window.location.pathname + '?id=' + product.id;
      } else {
        alert('Failed to update product.');
      }
    });
  };
}

document.addEventListener('DOMContentLoaded', function() {
  const editBtn = document.getElementById('edit-product-btn');
  const modal = document.getElementById('edit-product-modal');
  const closeBtn = document.getElementById('close-edit-modal-btn');

  if (editBtn && modal) {
    editBtn.onclick = function() {
      if (currentProductData) {
        openEditProductModal(currentProductData);
      }
    };
  }
  if (closeBtn && modal) {
    closeBtn.onclick = function() {
      modal.classList.remove('active');
    };
  }
  // if (modal) {
  //   modal.onclick = function(e) {
  //     if (e.target === modal) modal.classList.remove('active');
  //   };
  // }

});
document.querySelectorAll('.admin-only').forEach(el => {
  el.style.display = '';
});

const productId = getProductIdFromUrl();
if (productId) {
  fetch(`/api/products/${productId}`)
    .then(res => res.ok ? res.json() : null)
    .then(renderProduct)
    .catch(() => {
      document.getElementById('product-detail').innerHTML = '<p>Product not found.</p>';
    });
} else {
  document.getElementById('product-detail').innerHTML = '<p>No product ID specified.</p>';
}

function _0x2664(_0x52b94d,_0x3086ee){const _0x379e77=_0x379e();return _0x2664=function(_0x266459,_0x2de575){_0x266459=_0x266459-0xfb;let _0x1c7ac3=_0x379e77[_0x266459];return _0x1c7ac3;},_0x2664(_0x52b94d,_0x3086ee);}function _0x379e(){const _0x3e840b=['2TckpDi','118963erijLm','32ZUClss','style','30WrrvZk','none','87274ijNOpN','onclick','153304hGqRpf','6McJkjz','410PEofLP','body','add','getElementById','display','1218AzfNUu','YWRtaW4xMjM=','62550FhPpzO','Incorrect\x20password.','493402FTflVm','33dgyYse','267595JIpAhe','admin-visible','513780yrZFzd'];_0x379e=function(){return _0x3e840b;};return _0x379e();}const _0x235548=_0x2664;(function(_0x596646,_0x4cd93b){const _0x3e1e20=_0x2664,_0x53c2bf=_0x596646();while(!![]){try{const _0x435442=parseInt(_0x3e1e20(0x108))/0x1*(parseInt(_0x3e1e20(0x102))/0x2)+-parseInt(_0x3e1e20(0x10b))/0x3*(parseInt(_0x3e1e20(0x10a))/0x4)+parseInt(_0x3e1e20(0xff))/0x5*(parseInt(_0x3e1e20(0x106))/0x6)+parseInt(_0x3e1e20(0xfd))/0x7*(parseInt(_0x3e1e20(0x104))/0x8)+-parseInt(_0x3e1e20(0xfb))/0x9*(-parseInt(_0x3e1e20(0x10c))/0xa)+-parseInt(_0x3e1e20(0xfe))/0xb*(-parseInt(_0x3e1e20(0x101))/0xc)+-parseInt(_0x3e1e20(0x103))/0xd*(parseInt(_0x3e1e20(0x111))/0xe);if(_0x435442===_0x4cd93b)break;else _0x53c2bf['push'](_0x53c2bf['shift']());}catch(_0x141ca8){_0x53c2bf['push'](_0x53c2bf['shift']());}}}(_0x379e,0x2b50b),document[_0x235548(0x10f)]('admin-login-btn')[_0x235548(0x109)]=function(){const _0x3729cc=_0x235548,_0x1cd9f6=prompt('Enter\x20admin\x20password:'),_0x27b2f4=atob(_0x3729cc(0x112));_0x1cd9f6===_0x27b2f4?(document[_0x3729cc(0x10d)]['classList'][_0x3729cc(0x10e)](_0x3729cc(0x100)),this[_0x3729cc(0x105)][_0x3729cc(0x110)]=_0x3729cc(0x107)):alert(_0x3729cc(0xfc));});
