# ✨ StyleAura — Luxury Fashion E-Commerce Website

A modern, responsive fashion e-commerce web application built with **HTML5**, **CSS3**, **Vanilla JavaScript (ES6+)**, and **Bootstrap 5**. Designed specifically to showcase clean frontend architecture and best practices for **Frontend Developer Internship Interviews**.

---

## 🎨 Design & Aesthetic Overview

- **Brand Identity**: StyleAura Atelier — high-end luxury fashion boutique.
- **Color Palette**: 
  - **Cream / Warm Alabaster**: `#FAF7F2`, `#F4EFEB`
  - **White**: `#FFFFFF`
  - **Deep Charcoal / Onyx Black**: `#111111`, `#2A2A2A`
  - **Accent Muted Gold**: `#C5A880` (buttons, badges, highlights)
- **Typography**:
  - Headings: `Playfair Display` (Classic Editorial Serif)
  - Interface & Body: `Plus Jakarta Sans` (Crisp Geometric Sans-serif)

---

## 🚀 Key Features

1. **Responsive Navigation Bar**:
   - Sticky navbar with backdrop blur effect.
   - Real-time search bar with instant query matching and clear button.
   - Dynamic badges displaying live Wishlist and Shopping Bag counts with bounce animations.
   - Category navigation pills for quick filtering.

2. **Editorial Hero Section**:
   - High-impact luxury headline with "Shop Now" call to action.
   - Floating featured product card and key brand metrics (10K+ clients, 4.9/5 rating).

3. **Dynamic Product Catalog**:
   - Curated across 4 core categories: **Women**, **Men**, **Shoes**, and **Accessories**.
   - Product cards with high-resolution imagery, hover zoom micro-interactions, category tags, review stars, pricing, and dynamic badges (`Bestseller`, `Trending`, `Sale`, `New`).
   - Quick View button opening a modal with detailed specifications, size picker, and quantity selector.

4. **Interactive Shopping Bag (Offcanvas Drawer)**:
   - Slide-out drawer with zero page reloads.
   - Increase (`+`) and decrease (`-`) quantity controls.
   - Item removal (`trash` icon).
   - Free shipping progress bar (orders over $150).
   - Promo coupon code validator (Try: `AURASTYLE` for 15% off, `WELCOME10` for 10% off).
   - Dynamic automatic calculation of Subtotal, Promo Discount, Shipping, Tax, and Grand Total.

5. **Wishlist System**:
   - One-click heart toggle on any product card.
   - Saved items modal with 1-click "Move to Bag" or "Move All to Bag".

6. **State Persistence**:
   - Both **Cart** and **Wishlist** are automatically synced to `localStorage`. Refreshing or reopening the browser preserves user data.

7. **Checkout & Order Confirmation Flow**:
   - Interactive checkout modal with shipping address and payment simulator.
   - Generates a bespoke Order ID (e.g., `#SA-782910`) and confirmation dialog.

8. **Toast Notification System**:
   - Non-blocking floating alerts for adding/removing items and applying discounts.

---

## 📁 Project Structure

```text
e-commerce shopping/
│
├── index.html            # Semantic HTML5 markup and Bootstrap 5 components
├── css/
│   └── style.css         # Custom CSS variables, responsive typography, and luxury theme
├── js/
│   ├── products.js       # Product inventory dataset (separation of data and logic)
│   └── app.js            # Core application state, event delegation, cart & wishlist logic
└── README.md             # Project documentation and interview prep guide
```

---

## 💻 How to Run the Website

### Method 1: Double-Click (Direct Browser Launch)
Simply navigate to your project folder and double-click `index.html` to open it in your browser (Chrome, Edge, Firefox, Safari).

### Method 2: Python Local Server (Recommended for Developers)
Open your terminal inside this project folder:
```powershell
python -m http.server 3000
```
Then visit: `http://localhost:3000`

### Method 3: VS Code Live Server
Right-click `index.html` in VS Code and click **"Open with Live Server"**.

---

## 🎓 Frontend Interview Preparation Guide

Use this section to confidently explain your code in an internship interview!

### 1. Architectural Patterns
* **Single Source of Truth (SSOT)**:
  > *"Instead of reading data from HTML elements, all state (products, cart items, wishlist IDs, active category, search query, promo codes) lives in a single JavaScript `state` object. Whenever the user performs an action, we mutate this state and re-render the view."*

* **Separation of Concerns**:
  - `products.js` acts like a mock REST API database layer.
  - `app.js` manages business logic and DOM updates.
  - `style.css` controls visual presentation using CSS custom variables.
  - `index.html` provides semantic structure and accessibility (`aria-*` labels).

### 2. Key JavaScript Concepts Demonstrated
* **Array Methods**:
  - `.filter()` for category filtering and real-time text search.
  - `.reduce()` for calculating cart item counts and subtotal amounts.
  - `.find()` / `.findIndex()` for checking existing cart items and modifying quantities.
  - `.sort()` for price and rating reordering without mutating the master dataset.

* **Event Delegation**:
  > *"Instead of attaching individual click listeners to every product card's button, we attach a single listener to `#productGrid` and read `event.target.closest('[data-action]')`. This saves memory and automatically works for freshly rendered items."*

* **LocalStorage & JSON Handling**:
  > *"We serialize the cart and wishlist objects using `JSON.stringify()` before saving to `localStorage`. When the app loads, we deserialize them with `JSON.parse()`, safely wrapped in `try...catch` blocks to prevent JSON parsing crashes."*

### 3. CSS & Responsive Design
* **CSS Custom Properties (Variables)**:
  - Facilitates brand consistency (`--bg-cream`, `--text-dark`, `--accent-gold`).
  - Easy to extend into dark mode in the future.
* **Mobile-First Responsiveness**:
  - Bootstrap 5 grid breakpoints (`col-6 col-md-4 col-lg-3`).
  - Fluid typography with `clamp()` for responsive hero banners.
  - Touch-friendly tap targets (minimum 44x44px for buttons).

---

## 🧪 Validated Test Scenarios & Bug Fixes

- [x] **Product Search**: Instant case-insensitive filtering as user types; clear button (`x`) resets search smoothly.
- [x] **Category Filters**: Filtering across *All*, *Women*, *Men*, *Shoes*, and *Accessories* with live badge counts and smooth catalog scroll.
- [x] **Price & Rating Sorting**: Low-to-high, High-to-low, Customer rating, and Alphabetical sorting without mutating the master dataset.
- [x] **Shopping Bag (Add / Remove / Quantity)**:
  - Supports adding from product cards and from Quick View modal.
  - Multi-size variant isolation (`cartItemId`) prevents collisions between different sizes of the same product.
  - Decreasing quantity to 0 gracefully removes item from bag.
- [x] **Total Calculation**:
  - Automatically calculates Subtotal, Promo code discounts, Dynamic Shipping ($0 for orders $\ge \$150$, else $\$15$), 5% Tax, and Grand Total.
  - Interactive Free Shipping tracker bar turns green when unlocked.
- [x] **Wishlist**: Toggle heart icon turns active red, syncs across cards, modals, and counter badges.
- [x] **LocalStorage Persistence**: Cart and Wishlist automatically persist and recover upon page reloads.
- [x] **Checkout & Order Simulation**: Complete order modal collects customer info, provides summary, and issues bespoke `#SA-XXXXXX` confirmation.
- [x] **Mobile Responsiveness**:
  - Collapsible mobile navigation menu (`#navbarContent`) for mobile viewports.
  - Responsive 2-column card grid with optimized padding and readable font sizes on devices < 576px.
  - Full-width slide-out offcanvas bag on smaller viewports.
