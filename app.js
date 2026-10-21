/**
 * ==========================================================================
 * STYLEAURA - MAIN APPLICATION LOGIC
 * ==========================================================================
 * 
 * INTERVIEW ARCHITECTURE NOTES:
 * 1. Single Source of Truth (SSOT): We manage application state in a centralized `state` object.
 * 2. Unidirectional Data Flow: User Action -> State Mutation -> LocalStorage Sync -> Re-render UI.
 * 3. Event Delegation & Performance: Dynamic product cards use clean data attributes.
 * 4. Defensive Programming: Null checks, localStorage fallback, and error handling.
 */

// ---------------------------------------------------------------------------
// 1. Storage Keys & Initial Application State
// ---------------------------------------------------------------------------
const STORAGE_KEYS = {
  CART: 'styleaura_cart_v1',
  WISHLIST: 'styleaura_wishlist_v1'
};

const VALID_PROMO_CODES = {
  'AURASTYLE': 0.15, // 15% discount
  'WELCOME10': 0.10, // 10% discount
  'VIP20': 0.20       // 20% discount
};

const state = {
  products: (typeof PRODUCTS !== 'undefined' && Array.isArray(PRODUCTS)) ? [...PRODUCTS] : [],
  cart: [],
  wishlist: [],
  activeCategory: 'all',
  searchQuery: '',
  sortBy: 'default',
  appliedPromo: null,
  activeQuickViewProduct: null,
  selectedQuickViewSize: null
};

// ---------------------------------------------------------------------------
// 2. DOM Element Selectors Cache
// ---------------------------------------------------------------------------
let elements = {};

function initDOMElements() {
  elements = {
    // Product Catalog
    productGrid: document.getElementById('productGrid'),
    catalogCount: document.getElementById('catalogCount'),
    catalogEmptyState: document.getElementById('catalogEmptyState'),
    categoryPills: document.querySelectorAll('.cat-pill-btn'),
    sortSelect: document.getElementById('sortSelect'),
    searchInput: document.getElementById('navSearchInput'),
    searchClearBtn: document.getElementById('navSearchClear'),
    resetFiltersBtn: document.getElementById('btnResetFilters'),

    // Wishlist Elements
    wishlistCounterBadge: document.getElementById('wishlistCounterBadge'),
    wishlistItemsContainer: document.getElementById('wishlistItemsContainer'),
    wishlistEmptyState: document.getElementById('wishlistEmptyState'),
    wishlistItemsList: document.getElementById('wishlistItemsList'),
    btnClearWishlist: document.getElementById('btnClearWishlist'),
    btnMoveAllWishlistToCart: document.getElementById('btnMoveAllWishlistToCart'),

    // Cart Elements
    cartCounterBadge: document.getElementById('cartCounterBadge'),
    cartItemsContainer: document.getElementById('cartItemsContainer'),
    cartEmptyState: document.getElementById('cartEmptyState'),
    cartItemsList: document.getElementById('cartItemsList'),
    cartDrawerFooter: document.getElementById('cartDrawerFooter'),
    cartSubtotal: document.getElementById('cartSubtotal'),
    cartDiscountRow: document.getElementById('cartDiscountRow'),
    cartDiscountAmount: document.getElementById('cartDiscountAmount'),
    cartShipping: document.getElementById('cartShipping'),
    cartTax: document.getElementById('cartTax'),
    cartGrandTotal: document.getElementById('cartGrandTotal'),
    freeShippingBar: document.getElementById('freeShippingBar'),
    freeShippingMessage: document.getElementById('freeShippingMessage'),
    promoInput: document.getElementById('promoInput'),
    btnApplyPromo: document.getElementById('btnApplyPromo'),
    promoFeedback: document.getElementById('promoFeedback'),

    // Quick View Modal
    quickViewModalEl: document.getElementById('quickViewModal'),
    quickViewImage: document.getElementById('quickViewImage'),
    quickViewCategory: document.getElementById('quickViewCategory'),
    quickViewTitle: document.getElementById('quickViewTitle'),
    quickViewRating: document.getElementById('quickViewRating'),
    quickViewReviewsCount: document.getElementById('quickViewReviewsCount'),
    quickViewPrice: document.getElementById('quickViewPrice'),
    quickViewOriginalPrice: document.getElementById('quickViewOriginalPrice'),
    quickViewDescription: document.getElementById('quickViewDescription'),
    quickViewSizesContainer: document.getElementById('quickViewSizesContainer'),
    quickViewColors: document.getElementById('quickViewColors'),
    quickViewQtyInput: document.getElementById('quickViewQtyInput'),
    btnQuickViewQtyMinus: document.getElementById('btnQuickViewQtyMinus'),
    btnQuickViewQtyPlus: document.getElementById('btnQuickViewQtyPlus'),
    btnQuickViewAddToCart: document.getElementById('btnQuickViewAddToCart'),

    // Mobile Navigation
    navbarCollapse: document.getElementById('navbarContent'),
    navCatLinks: document.querySelectorAll('.nav-cat-link'),

    // Checkout Elements
    checkoutForm: document.getElementById('checkoutForm'),
    checkoutModalEl: document.getElementById('checkoutModal'),
    checkoutSummarySubtotal: document.getElementById('checkoutSummarySubtotal'),
    checkoutSummaryDiscount: document.getElementById('checkoutSummaryDiscount'),
    checkoutSummaryShipping: document.getElementById('checkoutSummaryShipping'),
    checkoutSummaryTotal: document.getElementById('checkoutSummaryTotal'),
    confirmationModalEl: document.getElementById('confirmationModal'),
    confirmOrderId: document.getElementById('confirmOrderId'),
    confirmTotalPaid: document.getElementById('confirmTotalPaid'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };
}

// Bootstrap modal/offcanvas instances
let quickViewModalInstance = null;
let checkoutModalInstance = null;
let confirmationModalInstance = null;
let cartOffcanvasInstance = null;

// ---------------------------------------------------------------------------
// 3. LocalStorage Persistence Functions
// ---------------------------------------------------------------------------
function loadStorageData() {
  try {
    const storedCart = localStorage.getItem(STORAGE_KEYS.CART);
    if (storedCart) {
      const parsedCart = JSON.parse(storedCart);
      if (Array.isArray(parsedCart)) {
        state.cart = parsedCart.map(item => {
          if (!item.cartItemId) {
            item.cartItemId = `${item.id}_${item.selectedSize || 'std'}`;
          }
          return item;
        });
      }
    }
  } catch (err) {
    console.error('Error loading cart from localStorage:', err);
    state.cart = [];
  }

  try {
    const storedWishlist = localStorage.getItem(STORAGE_KEYS.WISHLIST);
    if (storedWishlist) {
      const parsedWishlist = JSON.parse(storedWishlist);
      if (Array.isArray(parsedWishlist)) {
        state.wishlist = parsedWishlist;
      }
    }
  } catch (err) {
    console.error('Error loading wishlist from localStorage:', err);
    state.wishlist = [];
  }
}

function saveCartToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(state.cart));
  } catch (err) {
    console.error('Error saving cart to localStorage:', err);
  }
}

function saveWishlistToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(state.wishlist));
  } catch (err) {
    console.error('Error saving wishlist to localStorage:', err);
  }
}

// ---------------------------------------------------------------------------
// 4. Products Filtering & Sorting Pipeline
// ---------------------------------------------------------------------------
/**
 * Pure function: takes the master product catalog and returns the processed subset
 * based on current category, search text query, and active sort option.
 */
function getFilteredAndSortedProducts() {
  let result = [...state.products];

  // A. Filter by Category
  if (state.activeCategory && state.activeCategory !== 'all') {
    result = result.filter(item => item.category.toLowerCase() === state.activeCategory.toLowerCase());
  }

  // B. Filter by Search Query
  if (state.searchQuery && state.searchQuery.trim() !== '') {
    const query = state.searchQuery.trim().toLowerCase();
    result = result.filter(item => {
      const matchName = (item.name || '').toLowerCase().includes(query);
      const matchCategory = (item.categoryLabel || '').toLowerCase().includes(query);
      const matchDescription = (item.description || '').toLowerCase().includes(query);
      return matchName || matchCategory || matchDescription;
    });
  }

  // C. Sort
  switch (state.sortBy) {
    case 'price-asc':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      result.sort((a, b) => b.price - a.price);
      break;
    case 'rating-desc':
      result.sort((a, b) => b.rating - a.rating);
      break;
    case 'name-asc':
      result.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'default':
    default:
      // Keep curated catalog order
      break;
  }

  return result;
}

// ---------------------------------------------------------------------------
// 5. Render Functions
// ---------------------------------------------------------------------------

/**
 * Render the product grid dynamically using template literals
 */
function renderProductGrid() {
  if (!elements.productGrid) return;

  const filteredProducts = getFilteredAndSortedProducts();

  // Update item count indicator
  if (elements.catalogCount) {
    elements.catalogCount.textContent = `Showing ${filteredProducts.length} of ${state.products.length} items`;
  }

  // Handle empty state
  if (filteredProducts.length === 0) {
    elements.productGrid.innerHTML = '';
    if (elements.catalogEmptyState) {
      elements.catalogEmptyState.classList.remove('d-none');
    }
    return;
  }

  if (elements.catalogEmptyState) {
    elements.catalogEmptyState.classList.add('d-none');
  }

  // Render cards
  elements.productGrid.innerHTML = filteredProducts.map(product => {
    const isWishlisted = state.wishlist.includes(product.id);
    const isInCart = state.cart.some(item => item.id === product.id);

    // Badge styling
    let badgeHtml = '';
    if (product.badge) {
      let badgeClass = 'badge-dark-custom';
      if (product.badgeType === 'accent') badgeClass = 'badge-accent-custom';
      if (product.badgeType === 'sale') badgeClass = 'badge-sale-custom';
      if (product.badgeType === 'light') badgeClass = 'badge-light-custom';
      badgeHtml = `<span class="product-badge ${badgeClass}">${product.badge}</span>`;
    }

    // Strike-through original price
    const originalPriceHtml = product.originalPrice 
      ? `<span class="original-price">$${product.originalPrice.toFixed(2)}</span>` 
      : '';

    return `
      <div class="col-6 col-md-4 col-lg-3">
        <article class="product-card" data-product-id="${product.id}">
          <div class="product-img-box">
            ${badgeHtml}
            <div class="product-card-actions">
              <button 
                type="button" 
                class="btn-card-action wishlist-btn ${isWishlisted ? 'active' : ''}" 
                data-action="toggle-wishlist" 
                data-id="${product.id}"
                aria-label="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}"
                title="${isWishlisted ? 'Remove from Wishlist' : 'Save to Wishlist'}"
              >
                <i class="bi ${isWishlisted ? 'bi-heart-fill' : 'bi-heart'}"></i>
              </button>
              <button 
                type="button" 
                class="btn-card-action quickview-btn" 
                data-action="quick-view" 
                data-id="${product.id}"
                aria-label="Quick View"
                title="Quick View"
              >
                <i class="bi bi-eye"></i>
              </button>
            </div>
            <img 
              src="${product.image}" 
              alt="${product.name}" 
              loading="lazy"
              onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';"
            >
          </div>

          <div class="product-card-body">
            <span class="product-cat-tag">${product.categoryLabel}</span>
            <h3 class="product-name" title="${product.name}">${product.name}</h3>
            
            <div class="product-rating">
              <i class="bi bi-star-fill"></i>
              <span>${product.rating.toFixed(1)}</span>
              <span class="review-count">(${product.reviewsCount})</span>
            </div>

            <div class="product-pricing">
              <span class="current-price">$${product.price.toFixed(2)}</span>
              ${originalPriceHtml}
            </div>

            <button 
              type="button" 
              class="btn-add-cart ${isInCart ? 'added' : ''}" 
              data-action="add-to-cart" 
              data-id="${product.id}"
            >
              <i class="bi ${isInCart ? 'bi-check2' : 'bi-bag-plus'}"></i>
              <span>${isInCart ? 'In Bag' : 'Add to Bag'}</span>
            </button>
          </div>
        </article>
      </div>
    `;
  }).join('');
}

/**
 * Calculate totals for cart: subtotal, discount, shipping, tax, grand total
 */
function calculateCartTotals() {
  const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  let discountAmount = 0;
  if (state.appliedPromo && VALID_PROMO_CODES[state.appliedPromo]) {
    discountAmount = subtotal * VALID_PROMO_CODES[state.appliedPromo];
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  
  // Free shipping threshold: $150
  const freeShippingThreshold = 150;
  let shippingCost = 0;
  if (subtotal > 0) {
    shippingCost = subtotal >= freeShippingThreshold ? 0 : 15;
  }

  // 5% estimated tax
  const taxCost = taxableAmount > 0 ? (taxableAmount * 0.05) : 0;
  const grandTotal = taxableAmount + shippingCost + taxCost;

  return {
    subtotal,
    discountAmount,
    shippingCost,
    taxCost,
    grandTotal,
    freeShippingThreshold
  };
}

/**
 * Render Cart drawer contents and financial breakdown
 */
function renderCart() {
  const totals = calculateCartTotals();
  const totalItemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  // Update badge counter
  if (elements.cartCounterBadge) {
    elements.cartCounterBadge.textContent = totalItemCount;
    bumpBadge(elements.cartCounterBadge);
  }

  // Check if cart is empty
  if (state.cart.length === 0) {
    if (elements.cartEmptyState) elements.cartEmptyState.classList.remove('d-none');
    if (elements.cartItemsList) elements.cartItemsList.classList.add('d-none');
    if (elements.cartDrawerFooter) elements.cartDrawerFooter.classList.add('d-none');
    return;
  }

  if (elements.cartEmptyState) elements.cartEmptyState.classList.add('d-none');
  if (elements.cartItemsList) elements.cartItemsList.classList.remove('d-none');
  if (elements.cartDrawerFooter) elements.cartDrawerFooter.classList.remove('d-none');

  // Render Cart Item Cards
  if (elements.cartItemsList) {
    elements.cartItemsList.innerHTML = state.cart.map(item => {
      const lineTotal = (item.price * item.quantity).toFixed(2);
      const sizeDisplay = item.selectedSize ? `Size: ${item.selectedSize}` : '';
      const cId = item.cartItemId || item.id;

      return `
        <div class="cart-item-card" data-cart-id="${cId}">
          <img 
            src="${item.image}" 
            alt="${item.name}" 
            class="cart-item-thumb"
            onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=80';"
          >
          <div class="cart-item-info">
            <div class="d-flex justify-content-between align-items-start">
              <h4 class="cart-item-title">${item.name}</h4>
              <button 
                type="button" 
                class="btn-remove-item" 
                data-action="cart-remove" 
                data-cart-item-id="${cId}"
                aria-label="Remove ${item.name} from cart"
                title="Remove item"
              >
                <i class="bi bi-trash3"></i>
              </button>
            </div>
            ${sizeDisplay ? `<span class="cart-item-variant">${sizeDisplay}</span>` : ''}
            <div class="d-flex justify-content-between align-items-center mt-2">
              <div class="quantity-stepper">
                <button 
                  type="button" 
                  class="btn-stepper" 
                  data-action="cart-qty-minus" 
                  data-cart-item-id="${cId}"
                  aria-label="Decrease quantity"
                >
                  <i class="bi bi-dash"></i>
                </button>
                <input 
                  type="text" 
                  class="stepper-input" 
                  value="${item.quantity}" 
                  readonly 
                  aria-label="Quantity"
                >
                <button 
                  type="button" 
                  class="btn-stepper" 
                  data-action="cart-qty-plus" 
                  data-cart-item-id="${cId}"
                  aria-label="Increase quantity"
                >
                  <i class="bi bi-plus"></i>
                </button>
              </div>
              <span class="cart-item-price">$${lineTotal}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Update Summary Figures
  if (elements.cartSubtotal) elements.cartSubtotal.textContent = `$${totals.subtotal.toFixed(2)}`;
  
  if (elements.cartDiscountRow && elements.cartDiscountAmount) {
    if (totals.discountAmount > 0) {
      elements.cartDiscountRow.classList.remove('d-none');
      elements.cartDiscountAmount.textContent = `-$${totals.discountAmount.toFixed(2)} (${(VALID_PROMO_CODES[state.appliedPromo] * 100)}% off)`;
    } else {
      elements.cartDiscountRow.classList.add('d-none');
    }
  }

  if (elements.cartShipping) elements.cartShipping.textContent = totals.shippingCost === 0 ? 'FREE' : `$${totals.shippingCost.toFixed(2)}`;
  if (elements.cartTax) elements.cartTax.textContent = `$${totals.taxCost.toFixed(2)}`;
  if (elements.cartGrandTotal) elements.cartGrandTotal.textContent = `$${totals.grandTotal.toFixed(2)}`;

  // Update Free Shipping Progress Bar
  const amountRemaining = Math.max(0, totals.freeShippingThreshold - totals.subtotal);
  const percentComplete = Math.min(100, (totals.subtotal / totals.freeShippingThreshold) * 100);

  if (elements.freeShippingBar) {
    elements.freeShippingBar.style.width = `${percentComplete}%`;
    elements.freeShippingBar.setAttribute('aria-valuenow', Math.round(percentComplete));
    if (percentComplete >= 100) {
      elements.freeShippingBar.classList.add('bg-success');
    } else {
      elements.freeShippingBar.classList.remove('bg-success');
    }
  }
  if (elements.freeShippingMessage) {
    if (amountRemaining <= 0) {
      elements.freeShippingMessage.innerHTML = '🎉 You have unlocked <strong>FREE Shipping!</strong>';
    } else {
      elements.freeShippingMessage.innerHTML = `Add <strong>$${amountRemaining.toFixed(2)}</strong> more to unlock <strong>FREE Shipping</strong>`;
    }
  }
}

/**
 * Render Wishlist items
 */
function renderWishlist() {
  if (elements.wishlistCounterBadge) {
    elements.wishlistCounterBadge.textContent = state.wishlist.length;
    bumpBadge(elements.wishlistCounterBadge);
  }

  if (state.wishlist.length === 0) {
    if (elements.wishlistEmptyState) elements.wishlistEmptyState.classList.remove('d-none');
    if (elements.wishlistItemsList) elements.wishlistItemsList.classList.add('d-none');
    if (elements.btnClearWishlist) elements.btnClearWishlist.classList.add('d-none');
    if (elements.btnMoveAllWishlistToCart) elements.btnMoveAllWishlistToCart.classList.add('d-none');
    return;
  }

  if (elements.wishlistEmptyState) elements.wishlistEmptyState.classList.add('d-none');
  if (elements.wishlistItemsList) elements.wishlistItemsList.classList.remove('d-none');
  if (elements.btnClearWishlist) elements.btnClearWishlist.classList.remove('d-none');
  if (elements.btnMoveAllWishlistToCart) elements.btnMoveAllWishlistToCart.classList.remove('d-none');

  // Look up full product objects from product IDs stored in wishlist
  const wishlistedProducts = state.wishlist
    .map(id => getProductById(id))
    .filter(Boolean);

  if (elements.wishlistItemsList) {
    elements.wishlistItemsList.innerHTML = wishlistedProducts.map(product => {
      return `
        <div class="wishlist-item-card" data-wishlist-id="${product.id}">
          <img 
            src="${product.image}" 
            alt="${product.name}" 
            class="wishlist-item-thumb"
            onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=80';"
          >
          <div class="flex-grow-1">
            <span class="product-cat-tag">${product.categoryLabel}</span>
            <h5 class="mb-1" style="font-size: 0.92rem; font-weight: 600;">${product.name}</h5>
            <span class="fw-bold" style="font-size: 0.92rem;">$${product.price.toFixed(2)}</span>
          </div>
          <div class="d-flex flex-column gap-2 align-items-end">
            <button 
              type="button" 
              class="btn-wishlist-to-cart" 
              data-action="wishlist-move-to-cart" 
              data-id="${product.id}"
            >
              <i class="bi bi-bag-plus me-1"></i> Add to Bag
            </button>
            <button 
              type="button" 
              class="btn-remove-item" 
              data-action="wishlist-remove" 
              data-id="${product.id}"
              title="Remove from wishlist"
            >
              <i class="bi bi-trash3"></i> Remove
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
}

// Micro-interaction: Animated bump on badge count update
function bumpBadge(badgeEl) {
  if (!badgeEl) return;
  badgeEl.classList.remove('bump');
  void badgeEl.offsetWidth; // Reflow trigger
  badgeEl.classList.add('bump');
}

// Dynamic update of category nav pill counts
function updateCategoryPillCounts() {
  if (!elements.categoryPills) return;
  elements.categoryPills.forEach(pill => {
    const cat = pill.dataset.category;
    const countSpan = pill.querySelector('.pill-count');
    if (!countSpan) return;
    if (cat === 'all') {
      countSpan.textContent = state.products.length;
    } else {
      const count = state.products.filter(p => p.category === cat).length;
      countSpan.textContent = count;
    }
  });
}

// ---------------------------------------------------------------------------
// 6. Cart Business Logic (Add, Remove, Quantity, Promo)
// ---------------------------------------------------------------------------
function addToCart(productId, quantity = 1, selectedSize = null) {
  const product = getProductById(productId);
  if (!product) return;

  // Default size to first available size if not chosen
  const sizeToUse = selectedSize || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : null);
  const cartItemId = `${productId}_${sizeToUse || 'std'}`;

  // Check if this item with this size is already in cart
  const existingItem = state.cart.find(
    item => item.cartItemId === cartItemId || (item.id === productId && item.selectedSize === sizeToUse)
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    state.cart.push({
      cartItemId: cartItemId,
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      categoryLabel: product.categoryLabel,
      selectedSize: sizeToUse,
      quantity: quantity
    });
  }

  saveCartToStorage();
  renderCart();
  renderProductGrid();
  showToast(`"${product.name}" added to shopping bag.`, 'success');
}

function removeFromCart(cartItemId) {
  const itemIndex = state.cart.findIndex(
    item => item.cartItemId === cartItemId || item.id === cartItemId
  );
  if (itemIndex > -1) {
    const removedItemName = state.cart[itemIndex].name;
    state.cart.splice(itemIndex, 1);
    saveCartToStorage();
    renderCart();
    renderProductGrid();
    showToast(`Removed "${removedItemName}" from bag.`, 'info');
  }
}

function updateCartQuantity(cartItemId, delta) {
  const item = state.cart.find(
    item => item.cartItemId === cartItemId || item.id === cartItemId
  );
  if (!item) return;

  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    removeFromCart(cartItemId);
  } else {
    item.quantity = newQty;
    saveCartToStorage();
    renderCart();
  }
}

function applyPromoCode(code) {
  const sanitizedCode = (code || '').trim().toUpperCase();
  if (!sanitizedCode) {
    displayPromoFeedback('Please enter a coupon code.', 'danger');
    return;
  }

  if (VALID_PROMO_CODES[sanitizedCode]) {
    state.appliedPromo = sanitizedCode;
    const discountPercent = VALID_PROMO_CODES[sanitizedCode] * 100;
    displayPromoFeedback(`Success! Promo code ${sanitizedCode} (${discountPercent}% off) applied.`, 'success');
    renderCart();
    showToast(`Promo applied: ${discountPercent}% discount!`, 'success');
  } else {
    displayPromoFeedback('Invalid code. Try "AURASTYLE" for 15% off.', 'danger');
  }
}

function displayPromoFeedback(msg, type) {
  if (!elements.promoFeedback) return;
  elements.promoFeedback.className = `form-text text-${type} mt-1`;
  elements.promoFeedback.textContent = msg;
}

// ---------------------------------------------------------------------------
// 7. Wishlist Business Logic (Toggle, Remove, Move)
// ---------------------------------------------------------------------------
function toggleWishlist(productId) {
  const product = getProductById(productId);
  if (!product) return;

  const index = state.wishlist.indexOf(productId);
  if (index > -1) {
    // Remove
    state.wishlist.splice(index, 1);
    showToast(`"${product.name}" removed from wishlist.`, 'info');
  } else {
    // Add
    state.wishlist.push(productId);
    showToast(`"${product.name}" saved to wishlist!`, 'success');
  }

  saveWishlistToStorage();
  renderWishlist();
  renderProductGrid();
}

function removeFromWishlist(productId) {
  const product = getProductById(productId);
  const index = state.wishlist.indexOf(productId);
  if (index > -1) {
    state.wishlist.splice(index, 1);
    saveWishlistToStorage();
    renderWishlist();
    renderProductGrid();
    if (product) {
      showToast(`Removed "${product.name}" from wishlist.`, 'info');
    }
  }
}

function moveWishlistToCart(productId) {
  addToCart(productId, 1);
  removeFromWishlist(productId);
}

function moveAllWishlistToCart() {
  if (state.wishlist.length === 0) return;
  
  const count = state.wishlist.length;
  // Copy array because state.wishlist will be cleared
  [...state.wishlist].forEach(id => {
    addToCart(id, 1);
  });
  state.wishlist = [];
  saveWishlistToStorage();
  renderWishlist();
  renderProductGrid();
  showToast(`Moved ${count} item(s) from wishlist to your bag!`, 'success');
}

// ---------------------------------------------------------------------------
// 8. Quick View Modal Logic
// ---------------------------------------------------------------------------
function openQuickView(productId) {
  const product = getProductById(productId);
  if (!product) return;

  state.activeQuickViewProduct = product;
  state.selectedQuickViewSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : null;

  // Populate modal data
  if (elements.quickViewImage) {
    elements.quickViewImage.src = product.image;
    elements.quickViewImage.alt = product.name;
  }
  if (elements.quickViewCategory) elements.quickViewCategory.textContent = product.categoryLabel;
  if (elements.quickViewTitle) elements.quickViewTitle.textContent = product.name;
  if (elements.quickViewRating) elements.quickViewRating.textContent = product.rating.toFixed(1);
  if (elements.quickViewReviewsCount) elements.quickViewReviewsCount.textContent = `(${product.reviewsCount} reviews)`;
  if (elements.quickViewPrice) elements.quickViewPrice.textContent = `$${product.price.toFixed(2)}`;
  
  if (elements.quickViewOriginalPrice) {
    if (product.originalPrice) {
      elements.quickViewOriginalPrice.textContent = `$${product.originalPrice.toFixed(2)}`;
      elements.quickViewOriginalPrice.classList.remove('d-none');
    } else {
      elements.quickViewOriginalPrice.classList.add('d-none');
    }
  }

  if (elements.quickViewDescription) elements.quickViewDescription.textContent = product.description;
  if (elements.quickViewQtyInput) elements.quickViewQtyInput.value = 1;

  // Render sizes
  if (elements.quickViewSizesContainer) {
    if (product.sizes && product.sizes.length > 0) {
      elements.quickViewSizesContainer.innerHTML = product.sizes.map((size, idx) => `
        <button 
          type="button" 
          class="size-pill-option ${idx === 0 ? 'active' : ''}" 
          data-size="${size}"
        >
          ${size}
        </button>
      `).join('');
    } else {
      elements.quickViewSizesContainer.innerHTML = '<span class="text-muted small">Standard sizing</span>';
    }
  }

  // Render colors
  if (elements.quickViewColors) {
    if (product.colors && product.colors.length > 0) {
      elements.quickViewColors.textContent = product.colors.join(', ');
    } else {
      elements.quickViewColors.textContent = 'Standard';
    }
  }

  // Show modal
  if (quickViewModalInstance) {
    quickViewModalInstance.show();
  }
}

// ---------------------------------------------------------------------------
// 9. Checkout & Order Simulation
// ---------------------------------------------------------------------------
function openCheckoutModal() {
  if (state.cart.length === 0) {
    showToast('Your shopping bag is empty. Add products first!', 'warning');
    return;
  }

  const totals = calculateCartTotals();
  if (elements.checkoutSummarySubtotal) elements.checkoutSummarySubtotal.textContent = `$${totals.subtotal.toFixed(2)}`;
  if (elements.checkoutSummaryDiscount) {
    elements.checkoutSummaryDiscount.textContent = totals.discountAmount > 0 
      ? `-$${totals.discountAmount.toFixed(2)}` 
      : '$0.00';
  }
  if (elements.checkoutSummaryShipping) {
    elements.checkoutSummaryShipping.textContent = totals.shippingCost === 0 
      ? 'FREE' 
      : `$${totals.shippingCost.toFixed(2)}`;
  }
  if (elements.checkoutSummaryTotal) elements.checkoutSummaryTotal.textContent = `$${totals.grandTotal.toFixed(2)}`;

  // Close offcanvas cart drawer and show checkout modal
  if (cartOffcanvasInstance) {
    cartOffcanvasInstance.hide();
  }
  if (checkoutModalInstance) {
    checkoutModalInstance.show();
  }
}

function handleCheckoutSubmit(e) {
  e.preventDefault();

  const totals = calculateCartTotals();
  const orderId = 'SA-' + Math.floor(100000 + Math.random() * 900000);

  // Close checkout modal
  if (checkoutModalInstance) {
    checkoutModalInstance.hide();
  }

  // Populate confirmation
  if (elements.confirmOrderId) elements.confirmOrderId.textContent = orderId;
  if (elements.confirmTotalPaid) elements.confirmTotalPaid.textContent = `$${totals.grandTotal.toFixed(2)}`;

  // Clear cart state & storage
  state.cart = [];
  state.appliedPromo = null;
  if (elements.promoInput) elements.promoInput.value = '';
  if (elements.promoFeedback) {
    elements.promoFeedback.textContent = '';
    elements.promoFeedback.className = '';
  }
  saveCartToStorage();
  renderCart();
  renderProductGrid();

  // Show confirmation modal
  if (confirmationModalInstance) {
    confirmationModalInstance.show();
  }
}

// ---------------------------------------------------------------------------
// 10. Toast Notification System
// ---------------------------------------------------------------------------
function showToast(message, type = 'info') {
  if (!elements.toastContainer) return;

  const icons = {
    success: 'bi-check-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill',
    danger: 'bi-x-circle-fill'
  };

  const toastId = 'toast-' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast toast-aura align-items-center mb-2" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="3200">
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <i class="bi ${icons[type] || 'bi-info-circle-fill'} toast-icon"></i>
          <div>${message}</div>
        </div>
        <button type="button" class="btn-close btn-close-white ms-3" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  elements.toastContainer.insertAdjacentHTML('beforeend', toastHtml);
  const toastEl = document.getElementById(toastId);
  if (toastEl && typeof bootstrap !== 'undefined') {
    const bsToast = new bootstrap.Toast(toastEl);
    bsToast.show();

    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  }
}

// ---------------------------------------------------------------------------
// 11. Event Listeners Setup
// ---------------------------------------------------------------------------
function initEventListeners() {
  // --- Category Filters (Pills) ---
  if (elements.categoryPills) {
    elements.categoryPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        elements.categoryPills.forEach(p => p.classList.remove('active'));
        const targetPill = e.currentTarget;
        targetPill.classList.add('active');

        const category = targetPill.dataset.category || 'all';
        state.activeCategory = category;
        renderProductGrid();
      });
    });
  }

  // --- Category Visual Banner Click Handlers with A11y ---
  document.querySelectorAll('.category-tile-card').forEach(tile => {
    const activateCategory = () => {
      const category = tile.dataset.category;
      if (category) {
        state.activeCategory = category;
        // Sync active pill state
        if (elements.categoryPills) {
          elements.categoryPills.forEach(p => {
            p.classList.toggle('active', p.dataset.category === category);
          });
        }
        // Scroll smoothly to catalog
        const catalogSection = document.getElementById('catalogSection');
        if (catalogSection) {
          catalogSection.scrollIntoView({ behavior: 'smooth' });
        }
        renderProductGrid();
      }
    };

    tile.addEventListener('click', activateCategory);
    tile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateCategory();
      }
    });
  });

  // --- Search Input Filter ---
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      if (elements.searchClearBtn) {
        elements.searchClearBtn.style.display = state.searchQuery.length > 0 ? 'block' : 'none';
      }
      renderProductGrid();
    });
  }

  if (elements.searchClearBtn) {
    elements.searchClearBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      state.searchQuery = '';
      elements.searchClearBtn.style.display = 'none';
      renderProductGrid();
    });
  }

  // --- Sort Selector ---
  if (elements.sortSelect) {
    elements.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderProductGrid();
    });
  }

  // --- Reset Filters Button in Empty State ---
  if (elements.resetFiltersBtn) {
    elements.resetFiltersBtn.addEventListener('click', () => {
      state.activeCategory = 'all';
      state.searchQuery = '';
      state.sortBy = 'default';
      if (elements.searchInput) elements.searchInput.value = '';
      if (elements.searchClearBtn) elements.searchClearBtn.style.display = 'none';
      if (elements.sortSelect) elements.sortSelect.value = 'default';
      if (elements.categoryPills) {
        elements.categoryPills.forEach(p => {
          p.classList.toggle('active', p.dataset.category === 'all');
        });
      }
      renderProductGrid();
    });
  }

  // --- Event Delegation on Product Grid ---
  if (elements.productGrid) {
    elements.productGrid.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (!actionBtn) return;

      const action = actionBtn.dataset.action;
      const productId = actionBtn.dataset.id;

      if (action === 'toggle-wishlist') {
        toggleWishlist(productId);
      } else if (action === 'quick-view') {
        openQuickView(productId);
      } else if (action === 'add-to-cart') {
        addToCart(productId, 1);
        // Visual button feedback
        actionBtn.classList.add('added');
        actionBtn.innerHTML = '<i class="bi bi-check2"></i><span>Added ✓</span>';
        setTimeout(() => {
          actionBtn.innerHTML = '<i class="bi bi-check2"></i><span>In Bag</span>';
        }, 1200);
      }
    });
  }

  // --- Event Delegation on Cart Offcanvas Drawer ---
  if (elements.cartItemsContainer) {
    elements.cartItemsContainer.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (!actionBtn) return;

      const action = actionBtn.dataset.action;
      const cartItemId = actionBtn.dataset.cartItemId || actionBtn.dataset.id;

      if (action === 'cart-remove') {
        removeFromCart(cartItemId);
      } else if (action === 'cart-qty-plus') {
        updateCartQuantity(cartItemId, 1);
      } else if (action === 'cart-qty-minus') {
        updateCartQuantity(cartItemId, -1);
      }
    });
  }

  // --- Mobile & Header Nav Category Links ---
  if (elements.navCatLinks) {
    elements.navCatLinks.forEach(link => {
      link.addEventListener('click', () => {
        const category = link.dataset.category || 'all';
        state.activeCategory = category;

        // Sync category pills
        if (elements.categoryPills) {
          elements.categoryPills.forEach(p => {
            p.classList.toggle('active', p.dataset.category === category);
          });
        }
        if (elements.navCatLinks) {
          elements.navCatLinks.forEach(l => {
            l.classList.toggle('active', l.dataset.category === category);
          });
        }

        // Close mobile navbar collapse if expanded
        if (elements.navbarCollapse && elements.navbarCollapse.classList.contains('show') && typeof bootstrap !== 'undefined') {
          const bsCollapse = bootstrap.Collapse.getInstance(elements.navbarCollapse);
          if (bsCollapse) {
            bsCollapse.hide();
          }
        }

        renderProductGrid();
      });
    });
  }

  // --- Promo Code Application ---
  if (elements.btnApplyPromo) {
    elements.btnApplyPromo.addEventListener('click', () => {
      if (elements.promoInput) {
        applyPromoCode(elements.promoInput.value);
      }
    });
  }
  if (elements.promoInput) {
    elements.promoInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyPromoCode(elements.promoInput.value);
      }
    });
  }

  // --- Event Delegation on Wishlist Modal / Drawer ---
  if (elements.wishlistItemsContainer) {
    elements.wishlistItemsContainer.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (!actionBtn) return;

      const action = actionBtn.dataset.action;
      const productId = actionBtn.dataset.id;

      if (action === 'wishlist-remove') {
        removeFromWishlist(productId);
      } else if (action === 'wishlist-move-to-cart') {
        moveWishlistToCart(productId);
      }
    });
  }

  if (elements.btnClearWishlist) {
    elements.btnClearWishlist.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear your wishlist?')) {
        state.wishlist = [];
        saveWishlistToStorage();
        renderWishlist();
        renderProductGrid();
        showToast('Wishlist cleared.', 'info');
      }
    });
  }

  if (elements.btnMoveAllWishlistToCart) {
    elements.btnMoveAllWishlistToCart.addEventListener('click', () => {
      moveAllWishlistToCart();
    });
  }

  // --- Quick View Modal Event Handlers ---
  if (elements.quickViewSizesContainer) {
    elements.quickViewSizesContainer.addEventListener('click', (e) => {
      const sizeBtn = e.target.closest('.size-pill-option');
      if (sizeBtn) {
        elements.quickViewSizesContainer.querySelectorAll('.size-pill-option').forEach(b => b.classList.remove('active'));
        sizeBtn.classList.add('active');
        state.selectedQuickViewSize = sizeBtn.dataset.size;
      }
    });
  }

  if (elements.btnQuickViewQtyMinus) {
    elements.btnQuickViewQtyMinus.addEventListener('click', () => {
      let currentVal = parseInt(elements.quickViewQtyInput.value, 10) || 1;
      if (currentVal > 1) {
        elements.quickViewQtyInput.value = currentVal - 1;
      }
    });
  }

  if (elements.btnQuickViewQtyPlus) {
    elements.btnQuickViewQtyPlus.addEventListener('click', () => {
      let currentVal = parseInt(elements.quickViewQtyInput.value, 10) || 1;
      elements.quickViewQtyInput.value = currentVal + 1;
    });
  }

  if (elements.btnQuickViewAddToCart) {
    elements.btnQuickViewAddToCart.addEventListener('click', () => {
      if (!state.activeQuickViewProduct) return;
      const qty = parseInt(elements.quickViewQtyInput.value, 10) || 1;
      addToCart(state.activeQuickViewProduct.id, qty, state.selectedQuickViewSize);
      if (quickViewModalInstance) {
        quickViewModalInstance.hide();
      }
    });
  }

  // --- Checkout Triggers ---
  const btnTriggerCheckout = document.getElementById('btnProceedToCheckout');
  if (btnTriggerCheckout) {
    btnTriggerCheckout.addEventListener('click', () => {
      openCheckoutModal();
    });
  }

  if (elements.checkoutForm) {
    elements.checkoutForm.addEventListener('submit', handleCheckoutSubmit);
  }

  // Newsletter Form
  const newsletterForm = document.getElementById('newsletterForm');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('newsletterEmail');
      if (emailInput && emailInput.value) {
        showToast(`Thank you for subscribing, ${emailInput.value}!`, 'success');
        emailInput.value = '';
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 12. Application Initialization
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize DOM Selectors Cache
  initDOMElements();

  // 2. Initialize Bootstrap instances
  if (typeof bootstrap !== 'undefined') {
    if (elements.quickViewModalEl) {
      quickViewModalInstance = new bootstrap.Modal(elements.quickViewModalEl);
    }
    if (elements.checkoutModalEl) {
      checkoutModalInstance = new bootstrap.Modal(elements.checkoutModalEl);
    }
    if (elements.confirmationModalEl) {
      confirmationModalInstance = new bootstrap.Modal(elements.confirmationModalEl);
    }
    const cartOffcanvasEl = document.getElementById('cartOffcanvas');
    if (cartOffcanvasEl) {
      cartOffcanvasInstance = new bootstrap.Offcanvas(cartOffcanvasEl);
    }
  }

  // 3. Load persisted data from localStorage
  loadStorageData();

  // 4. Update category navigation count pills
  updateCategoryPillCounts();

  // 5. Initialize Event Listeners
  initEventListeners();

  // 6. Initial Renders
  renderProductGrid();
  renderCart();
  renderWishlist();

  console.log('✨ StyleAura E-Commerce initialized successfully.');
});
