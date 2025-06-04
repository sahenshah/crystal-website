function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

function renderProduct(product) {
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