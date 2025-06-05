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

  container.innerHTML = `
    <div class="product-card product-detail-card">
      <img src="${product.image || 'images/crystal-logo.png'}" alt="${product.name}">
      <div class="product-detail-info">
        <h2>${product.name}</h2>
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
}

// Modal for editing product
let currentProductData = null;

function openEditProductModal(product) {
  const modal = document.getElementById('edit-product-modal');
  modal.classList.add('active');
  document.getElementById('edit-product-name').value = product.name || '';
  document.getElementById('edit-product-brand').value = product.brand || '';
  document.getElementById('edit-product-finish').value = product.finish || '';
  document.getElementById('edit-product-description').value = product.description || '';

  // --- Packing dots logic ---
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

  // --- Sizes list logic ---
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

  // Initial render for current brand
  renderPackingDots(brandSelect.value);

  // Update packing dots on brand change
  brandSelect.addEventListener('change', function() {
    renderPackingDots(this.value);
  });

  // --- Handle image upload functionality ---
  const imageInput = document.getElementById('edit-product-image');
  const imageUploadBtn = document.getElementById('edit-image-upload-btn');
  const imagePreview = document.getElementById('edit-image-preview');

  if (imageUploadBtn && imageInput) {
    imageUploadBtn.onclick = function(e) {
      e.preventDefault();
      imageInput.click();
    };

    imageInput.onchange = function() {
      if (imageInput.files && imageInput.files[0]) {
        // Show preview of the new image
        const reader = new FileReader();
        reader.onload = function(e) {
          imagePreview.src = e.target.result;
          imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(imageInput.files[0]);
      } else {
        imagePreview.src = product.image || 'images/crystal-logo.png';
        imagePreview.style.display = product.image ? 'block' : 'none';
      }
    };
  }

  // Show current product image (no filename)
  if (imagePreview) {
    imagePreview.src = product.image || 'images/crystal-logo.png';
    imagePreview.style.display = 'block';
  }

  document.getElementById('close-edit-modal-btn').onclick = function() {
    modal.classList.remove('active');
  };
  modal.onclick = function(e) {
    if (e.target === modal) modal.classList.remove('active');
  };

  document.getElementById('edit-product-form').onsubmit = function(e) {
    e.preventDefault();

    const sizes = Array.from(sizesList.querySelectorAll('.size-row')).map(row => {
      const size = row.querySelector('.size-row-size')?.textContent || '';
      const packing = row.querySelector('.size-row-packing')?.textContent || '';
      const gauge = Array.from(row.querySelectorAll('.size-row-dots .dot')).map(dot => dot.getAttribute('data-value'));
      return { size, packing, gauge };
    });

    const imageInput = document.getElementById('edit-product-image');
    if (imageInput.files && imageInput.files[0]) {
      const reader = new FileReader();
      reader.onload = function(event) {
        const updatedProduct = {
          name: document.getElementById('edit-product-name').value,
          brand: document.getElementById('edit-product-brand').value,
          finish: document.getElementById('edit-product-finish').value,
          description: document.getElementById('edit-product-description').value,
          sizes,
          image: event.target.result // base64 string
        };
        sendPatch(updatedProduct);
      };
      reader.readAsDataURL(imageInput.files[0]);
    } else {
      const updatedProduct = {
        name: document.getElementById('edit-product-name').value,
        brand: document.getElementById('edit-product-brand').value,
        finish: document.getElementById('edit-product-finish').value,
        description: document.getElementById('edit-product-description').value,
        sizes
        // no image field, keep existing image
      };
      sendPatch(updatedProduct);
    }

    function sendPatch(updatedProduct) {
      fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct)
      })
      .then(res => {
        if (res.ok) {
          modal.classList.remove('active');
          location.reload();
        } else {
          alert('Failed to update product.');
        }
      });
    }
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
  if (modal) {
    modal.onclick = function(e) {
      if (e.target === modal) modal.classList.remove('active');
    };
  }
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

// edit privileges for admin users
function _0x2664(_0x52b94d,_0x3086ee){const _0x379e77=_0x379e();return _0x2664=function(_0x266459,_0x2de575){_0x266459=_0x266459-0xfb;let _0x1c7ac3=_0x379e77[_0x266459];return _0x1c7ac3;},_0x2664(_0x52b94d,_0x3086ee);}function _0x379e(){const _0x3e840b=['2TckpDi','118963erijLm','32ZUClss','style','30WrrvZk','none','87274ijNOpN','onclick','153304hGqRpf','6McJkjz','410PEofLP','body','add','getElementById','display','1218AzfNUu','YWRtaW4xMjM=','62550FhPpzO','Incorrect\x20password.','493402FTflVm','33dgyYse','267595JIpAhe','admin-visible','513780yrZFzd'];_0x379e=function(){return _0x3e840b;};return _0x379e();}const _0x235548=_0x2664;(function(_0x596646,_0x4cd93b){const _0x3e1e20=_0x2664,_0x53c2bf=_0x596646();while(!![]){try{const _0x435442=parseInt(_0x3e1e20(0x108))/0x1*(parseInt(_0x3e1e20(0x102))/0x2)+-parseInt(_0x3e1e20(0x10b))/0x3*(parseInt(_0x3e1e20(0x10a))/0x4)+parseInt(_0x3e1e20(0xff))/0x5*(parseInt(_0x3e1e20(0x106))/0x6)+parseInt(_0x3e1e20(0xfd))/0x7*(parseInt(_0x3e1e20(0x104))/0x8)+-parseInt(_0x3e1e20(0xfb))/0x9*(-parseInt(_0x3e1e20(0x10c))/0xa)+-parseInt(_0x3e1e20(0xfe))/0xb*(-parseInt(_0x3e1e20(0x101))/0xc)+-parseInt(_0x3e1e20(0x103))/0xd*(parseInt(_0x3e1e20(0x111))/0xe);if(_0x435442===_0x4cd93b)break;else _0x53c2bf['push'](_0x53c2bf['shift']());}catch(_0x141ca8){_0x53c2bf['push'](_0x53c2bf['shift']());}}}(_0x379e,0x2b50b),document[_0x235548(0x10f)]('admin-login-btn')[_0x235548(0x109)]=function(){const _0x3729cc=_0x235548,_0x1cd9f6=prompt('Enter\x20admin\x20password:'),_0x27b2f4=atob(_0x3729cc(0x112));_0x1cd9f6===_0x27b2f4?(document[_0x3729cc(0x10d)]['classList'][_0x3729cc(0x10e)](_0x3729cc(0x100)),this[_0x3729cc(0x105)][_0x3729cc(0x110)]=_0x3729cc(0x107)):alert(_0x3729cc(0xfc));});
// Show all admin-only elements
document.querySelectorAll('.admin-only').forEach(el => {
  el.style.display = '';
});
