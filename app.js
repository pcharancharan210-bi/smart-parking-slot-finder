/**
 * Smart Parking Slot Finder - Web Application Controller
 * Responsive Single Page App (SPA) Engine, Leaflet Maps, and Firebase Synchronization
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global Application State
  const state = {
    currentPage: 'splash',
    selectedLocation: null,
    selectedVehicleType: 'All',
    lastBooking: null,
    activeBookingsTab: 'upcoming',
    searchQuery: '',
    mapInstance: null,
    mapMarkers: [],
    extendingBookingId: null,
    isAdmin: false
  };

  // DOM Elements
  const pages = document.querySelectorAll('.web-page');
  const navLinkBtns = document.querySelectorAll('.nav-link-btn');
  const webNavbar = document.getElementById('web-navbar');
  const mainNavLinks = document.getElementById('main-nav-links');
  const userChipBtn = document.getElementById('user-chip-btn');
  const toastEl = document.getElementById('web-toast');
  const firebaseStatusChip = document.getElementById('firebase-status-chip');
  const modalFirebase = document.getElementById('modal-firebase-config');
  const modalExtend = document.getElementById('modal-extend-booking');

  // ================= Step-by-Step Navigation Router ================= //
  function navigateTo(pageId, params = {}) {
    // Hide all pages
    pages.forEach(page => page.classList.remove('active'));

    // Show target page
    const target = document.getElementById(`page-${pageId}`);
    if (target) {
      target.classList.add('active');
      state.currentPage = pageId;
    }

    // Scroll window smoothly to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Manage Navbar Links & Visibility based on user session & current view
    const user = window.parkingDataService.getUser();
    const isAuthOrLanding = ['splash', 'login', 'signup', 'admin-login', 'admin-dashboard'].includes(pageId);

    if (user && user.isLoggedIn && !isAuthOrLanding) {
      if (mainNavLinks) mainNavLinks.style.display = 'flex';
      if (userChipBtn) userChipBtn.style.display = 'flex';
    } else if (isAuthOrLanding) {
      if (mainNavLinks) mainNavLinks.style.display = 'none';
      if (userChipBtn) userChipBtn.style.display = 'none';
    }

    // Update active state on Navbar links
    navLinkBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });

    // Page-specific Initializers
    if (pageId === 'home') {
      renderHomeScreen();
    } else if (pageId === 'map') {
      initOrRefreshMap();
    } else if (pageId === 'details') {
      renderDetailsPage(params.locationId || (state.selectedLocation ? state.selectedLocation.id : 'city-mall'));
    } else if (pageId === 'book') {
      initBookingForm(params.locationId || (state.selectedLocation ? state.selectedLocation.id : 'city-mall'));
    } else if (pageId === 'confirmed') {
      renderConfirmedPage(params.booking || state.lastBooking);
    } else if (pageId === 'bookings') {
      renderBookingsPage();
    } else if (pageId === 'profile') {
      renderProfilePage();
    } else if (pageId === 'admin-dashboard') {
      if (!state.isAdmin) {
        navigateTo('admin-login');
        return;
      }
      renderAdminDashboard();
    }
  }

  // Navbar Links Click Handlers
  navLinkBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPage = btn.dataset.page;
      navigateTo(targetPage);
    });
  });

  // Brand Logo Click: Go Home if logged in, otherwise Splash
  const brandLogo = document.getElementById('brand-logo');
  if (brandLogo) {
    brandLogo.addEventListener('click', () => {
      const user = window.parkingDataService.getUser();
      navigateTo(user && user.isLoggedIn ? 'home' : 'splash');
    });
  }

  // User Chip Click: Go to Profile
  if (userChipBtn) {
    userChipBtn.addEventListener('click', () => navigateTo('profile'));
  }

  // Global Back Buttons
  document.querySelectorAll('.btn-back-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const backTarget = btn.dataset.back || 'home';
      navigateTo(backTarget);
    });
  });

  // Mobile Menu Toggle
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
      if (mainNavLinks) {
        const isShown = mainNavLinks.style.display === 'flex';
        mainNavLinks.style.display = isShown ? 'none' : 'flex';
        mainNavLinks.style.flexDirection = 'column';
        mainNavLinks.style.position = 'absolute';
        mainNavLinks.style.top = '64px';
        mainNavLinks.style.left = '0';
        mainNavLinks.style.right = '0';
        mainNavLinks.style.background = '#FFFFFF';
        mainNavLinks.style.padding = '16px';
        mainNavLinks.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
      }
    });
  }

  // ================= Toast Notification ================= //
  function showToast(message, duration = 3000) {
    if (!toastEl) return;
    toastEl.querySelector('.web-toast-text').textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, duration);
  }
  window.showToast = showToast;

  // ================= PAGE 1: SPLASH & LANDING FLOW ================= //
  // "Get Started" Button: When clicked, the Login page appears!
  const btnGetStarted = document.getElementById('btn-get-started');
  if (btnGetStarted) {
    btnGetStarted.addEventListener('click', () => {
      const user = window.parkingDataService.getUser();
      if (user && user.isLoggedIn) {
        navigateTo('home');
      } else {
        navigateTo('login');
      }
    });
  }

  // "Login to Account" Quick Button
  const btnQuickLogin = document.getElementById('btn-quick-login');
  if (btnQuickLogin) {
    btnQuickLogin.addEventListener('click', () => navigateTo('login'));
  }

  // "Admin Login" Quick Button (Placed beside "Login to Account" on landing page)
  const btnQuickAdminLogin = document.getElementById('btn-quick-admin-login');
  if (btnQuickAdminLogin) {
    btnQuickAdminLogin.addEventListener('click', () => {
      if (state.isAdmin) {
        navigateTo('admin-dashboard');
      } else {
        navigateTo('admin-login');
      }
    });
  }

  // ================= PAGE 2: LOGIN FLOW ================= //
  const btnLoginBackLanding = document.getElementById('btn-login-back-landing');
  if (btnLoginBackLanding) {
    btnLoginBackLanding.addEventListener('click', () => navigateTo('splash'));
  }

  const formLogin = document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const phone = document.getElementById('login-phone').value.trim();
      const pwd = document.getElementById('login-password').value.trim();
      const confirmPwd = document.getElementById('login-confirm-password').value.trim();

      if (!email || !phone || !pwd || !confirmPwd) {
        showToast('⚠️ Please enter email, phone number, and both passwords');
        return;
      }

      if (pwd !== confirmPwd) {
        showToast('⚠️ Password and Confirm Password do not match');
        return;
      }

      const user = window.parkingDataService.getUser();
      user.isLoggedIn = true;
      if (email.includes('@')) user.email = email;
      if (phone) user.phone = phone;
      window.parkingDataService.saveUser(user);

      showToast(`✅ Welcome back, ${user.fullName}!`);
      navigateTo('home');
    });
  }

  // Switch from Login to Sign Up
  const linkToSignup = document.getElementById('link-to-signup');
  if (linkToSignup) {
    linkToSignup.addEventListener('click', () => navigateTo('signup'));
  }

  // Switch from User Login to Admin Login
  const linkLoginToAdmin = document.getElementById('link-login-to-admin');
  if (linkLoginToAdmin) {
    linkLoginToAdmin.addEventListener('click', () => navigateTo('admin-login'));
  }

  // Continue with Google Simulation
  const btnGoogleLogin = document.getElementById('btn-google-login');
  if (btnGoogleLogin) {
    btnGoogleLogin.addEventListener('click', () => {
      const user = window.parkingDataService.getUser();
      user.isLoggedIn = true;
      window.parkingDataService.saveUser(user);
      showToast(`✅ Signed in with Google as ${user.fullName}!`);
      navigateTo('home');
    });
  }

  // Forgot Password
  const linkForgotPwd = document.getElementById('link-forgot-pwd');
  if (linkForgotPwd) {
    linkForgotPwd.addEventListener('click', () => {
      alert('Password reset link has been dispatched to your email address.');
    });
  }

  // Password Visibility Toggles
  document.querySelectorAll('.btn-pwd-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (input && (input.type === 'password' || input.type === 'text')) {
        const isPwd = input.type === 'password';
        input.type = isPwd ? 'text' : 'password';
        btn.querySelector('svg').style.opacity = isPwd ? '1' : '0.5';
      }
    });
  });

  // ================= PAGE 3: SIGN UP FLOW ================= //
  const btnSignupBackLogin = document.getElementById('btn-signup-back-login');
  if (btnSignupBackLogin) {
    btnSignupBackLogin.addEventListener('click', () => navigateTo('login'));
  }

  const formSignup = document.getElementById('form-signup');
  if (formSignup) {
    formSignup.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const phone = document.getElementById('signup-phone').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const pwd = document.getElementById('signup-password').value.trim();
      const confirmPwd = document.getElementById('signup-confirm-password').value.trim();

      if (!name || !phone || !email || !pwd) {
        showToast('⚠️ Please fill in all registration fields');
        return;
      }

      if (pwd !== confirmPwd) {
        showToast('⚠️ Passwords do not match');
        return;
      }

      const newUser = {
        fullName: name,
        phone: phone,
        email: email,
        isLoggedIn: true,
        vehicles: [
          { type: 'Car', number: 'KA 01 AB 1234', model: 'Honda City' }
        ]
      };

      window.parkingDataService.saveUser(newUser);
      showToast(`🎉 Welcome to Smart Parking, ${name}!`);
      navigateTo('home');
    });
  }

  // Switch from Sign Up to Login
  const linkToLogin = document.getElementById('link-to-login');
  if (linkToLogin) {
    linkToLogin.addEventListener('click', () => navigateTo('login'));
  }

  // City Profiles for Quick Location Testing
  const CITY_PROFILES = {
    mysore: { lat: 12.3088, lng: 76.6521, name: "Mysore Central" },
    bangalore: { lat: 12.9716, lng: 77.5946, name: "Bangalore (MG Road)" },
    mumbai: { lat: 19.0596, lng: 72.8295, name: "Mumbai (Bandra)" },
    delhi: { lat: 28.6315, lng: 77.2167, name: "Delhi (CP)" }
  };

  function updateLocationUI(areaName) {
    const locNameEl = document.getElementById('user-location-name');
    if (locNameEl) locNameEl.textContent = areaName;

    const selectTestCity = document.getElementById('select-test-city');
    if (selectTestCity) {
      let optionFound = false;
      for (const opt of selectTestCity.options) {
        if (opt.value === 'detected') {
          opt.textContent = `📍 ${areaName} (Auto-Detected)`;
          opt.selected = true;
          optionFound = true;
          break;
        }
      }
      if (!optionFound) {
        const newOpt = document.createElement('option');
        newOpt.value = 'detected';
        newOpt.textContent = `📍 ${areaName} (Auto-Detected)`;
        newOpt.selected = true;
        selectTestCity.insertBefore(newOpt, selectTestCity.firstChild);
      }
    }
  }

  // Resilient Multi-Source Geolocation Engine (Device GPS + Network IP Fallback)
  async function detectUserLocation(interactive = false) {
    const btnDetect = document.getElementById('btn-detect-gps');
    const originalHtml = btnDetect ? btnDetect.innerHTML : '';
    if (btnDetect) {
      btnDetect.disabled = true;
      btnDetect.innerHTML = `
        <svg class="spin-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
        <span>Detecting...</span>
      `;
    }

    if (interactive) showToast('📍 Detecting your location via GPS / Network...');

    // Helper: Reverse Geocode coordinates to city/area name
    async function reverseGeocode(lat, lng) {
      try {
        const bgRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
        if (bgRes.ok) {
          const bgData = await bgRes.json();
          const place = bgData.locality || bgData.city || bgData.principalSubdivision;
          if (place) {
            const state = bgData.principalSubdivision ? `, ${bgData.principalSubdivision}` : '';
            return `${place}${state}`;
          }
        }
      } catch (e) {
        console.warn('Reverse geocode error:', e);
      }

      try {
        const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          const addr = nomData.address || {};
          const place = addr.suburb || addr.city || addr.town || addr.village || addr.county || "Local Area";
          return place;
        }
      } catch (e) {}

      return `GPS (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
    }

    // Helper: IP-based Geolocation Fallback (Works 100% on desktops and when GPS is denied/timeout)
    async function fetchIpLocation() {
      try {
        const res = await fetch('https://ipwho.is/');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.latitude && data.longitude) {
            const city = data.city || data.region || 'Current Area';
            const region = data.region ? `, ${data.region}` : '';
            return {
              lat: data.latitude,
              lng: data.longitude,
              areaName: `${city}${region}`,
              source: 'Network'
            };
          }
        }
      } catch (e) {
        console.warn('ipwho.is error:', e);
      }

      try {
        const res = await fetch('https://freeipapi.com/api/json');
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude) {
            const city = data.cityName || 'Current Area';
            const region = data.regionName ? `, ${data.regionName}` : '';
            return {
              lat: data.latitude,
              lng: data.longitude,
              areaName: `${city}${region}`,
              source: 'Network'
            };
          }
        }
      } catch (e) {
        console.warn('freeipapi error:', e);
      }

      return null;
    }

    let detectedLocation = null;

    // Source 1: Browser GPS / Geolocation API (Low accuracy first for fast response)
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: false,
            maximumAge: 60000
          });
        });

        if (position && position.coords) {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const areaName = await reverseGeocode(lat, lng);
          detectedLocation = { lat, lng, areaName, source: 'Device GPS' };
        }
      } catch (gpsError) {
        console.log('Browser GPS skipped or timed out, trying IP location fallback...', gpsError.message);
      }
    }

    // Source 2: If GPS was unavailable, denied, or timed out -> Automatic IP Geolocation
    if (!detectedLocation) {
      detectedLocation = await fetchIpLocation();
    }

    // Reset button UI
    if (btnDetect) {
      btnDetect.disabled = false;
      btnDetect.innerHTML = originalHtml;
    }

    if (detectedLocation) {
      window.parkingDataService.setUserLocation(
        detectedLocation.lat,
        detectedLocation.lng,
        detectedLocation.areaName
      );
      updateLocationUI(detectedLocation.areaName);
      showToast(`📍 Location detected: ${detectedLocation.areaName}! Updated nearby parking.`);
      await renderHomeScreen();
      if (state.currentPage === 'map') initOrRefreshMap();
      return true;
    } else {
      if (interactive) {
        showToast('⚠️ Could not auto-detect location. Please pick a city from the dropdown.');
      }
      return false;
    }
  }

  // Detect GPS Location Buttons
  const btnDetectGps = document.getElementById('btn-detect-gps');
  if (btnDetectGps) btnDetectGps.addEventListener('click', () => detectUserLocation(true));

  const btnSearchLocate = document.getElementById('btn-search-locate');
  if (btnSearchLocate) btnSearchLocate.addEventListener('click', () => detectUserLocation(true));

  // Quick City Selector Dropdown
  const selectTestCity = document.getElementById('select-test-city');
  if (selectTestCity) {
    selectTestCity.addEventListener('change', (e) => {
      const cityKey = e.target.value;
      if (cityKey === 'detected') {
        const saved = window.parkingDataService.getUserLocation();
        updateLocationUI(saved.areaName);
        renderHomeScreen();
        if (state.currentPage === 'map') initOrRefreshMap();
        return;
      }
      const city = CITY_PROFILES[cityKey] || CITY_PROFILES.mysore;
      window.parkingDataService.setUserLocation(city.lat, city.lng, city.name);
      updateLocationUI(city.name);
      showToast(`📍 Switched location to ${city.name}. Updated nearby spots!`);
      renderHomeScreen();
      if (state.currentPage === 'map') initOrRefreshMap();
    });
  }

  // Generate Duplicate Spots Button (Home Dashboard)
  const btnGenerateDuplicates = document.getElementById('btn-generate-duplicates');
  if (btnGenerateDuplicates) {
    btnGenerateDuplicates.addEventListener('click', async () => {
      const coords = window.parkingDataService.getUserLocation();
      const duplicates = window.parkingDataService.generateNearbyDuplicateParking(coords.lat, coords.lng, coords.areaName, 4);
      const existing = await window.parkingDataService.getLocations();
      const combined = [...duplicates, ...existing];
      localStorage.setItem(window.parkingDataService.storageKeyLocations, JSON.stringify(combined));

      showToast(`✨ Generated 4 duplicate parking areas with available slots near ${coords.areaName}!`);
      renderHomeScreen();
      if (state.currentPage === 'map') initOrRefreshMap();
    });
  }

  // Generate Duplicate Spots Button (Map Sidebar)
  const btnMapGenerateSpots = document.getElementById('btn-map-generate-spots');
  if (btnMapGenerateSpots) {
    btnMapGenerateSpots.addEventListener('click', async () => {
      let centerLat = 12.3088, centerLng = 76.6521;
      if (state.mapInstance) {
        const center = state.mapInstance.getCenter();
        centerLat = center.lat;
        centerLng = center.lng;
      }
      const coords = window.parkingDataService.getUserLocation();
      const duplicates = window.parkingDataService.generateNearbyDuplicateParking(centerLat, centerLng, coords.areaName || "Area", 4);
      const existing = await window.parkingDataService.getLocations();
      const combined = [...duplicates, ...existing];
      localStorage.setItem(window.parkingDataService.storageKeyLocations, JSON.stringify(combined));

      showToast('✨ Generated 4 duplicate parking areas around current map view!');
      initOrRefreshMap();
      renderHomeScreen();
    });
  }

  // ================= PAGE 4: HOME DASHBOARD FLOW ================= //
  async function renderHomeScreen() {
    const coords = window.parkingDataService.getUserLocation();
    updateLocationUI(coords.areaName || "Mysore Central");

    const locations = await window.parkingDataService.getLocations(coords);
    const grid = document.getElementById('popular-locations-grid');
    if (!grid) return;

    // Filter by search query & vehicle category
    const filtered = locations.filter(loc => {
      const matchesSearch = !state.searchQuery || 
        loc.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(state.searchQuery.toLowerCase());
      
      const matchesVehicle = !state.selectedVehicleType || 
        state.selectedVehicleType === 'All' ||
        (loc.vehicleTypes && loc.vehicleTypes.includes(state.selectedVehicleType));

      return matchesSearch && matchesVehicle;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-placeholder" style="grid-column: 1 / -1;">
          <p style="margin-bottom: 12px;">No parking spots available matching your filter in this area.</p>
          <button class="btn-primary-web" onclick="document.getElementById('btn-generate-duplicates').click()">✨ Auto-Generate Nearby Parking Spots</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(loc => `
      <div class="web-loc-card" data-id="${loc.id}">
        <div class="card-img-wrap">
          <img src="${loc.image}" alt="${loc.name}" class="card-img" onerror="this.src='assets/images/city_mall.jpg'" />
          <span class="card-badge-distance">${loc.distanceKm} km away</span>
        </div>
        <div class="card-content">
          <h4 class="card-name">${loc.name}</h4>
          <div class="card-address">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>${loc.address}</span>
          </div>
          <div class="card-vehicles-row">
            <span class="badge-mini-v">🚗 Cars</span>
            <span class="badge-mini-v">🏍️ Bikes</span>
            <span class="badge-mini-v">🚛 Trucks</span>
            <span class="badge-mini-v">⚡ EVs</span>
          </div>
          <div class="card-stats-row">
            <div>
              <span style="font-size: 11px; color: #64748B; display: block;">Available</span>
              <span class="card-slot-stat">${loc.availableSlots} / ${loc.totalSlots} Slots</span>
            </div>
            <div>
              <span style="font-size: 11px; color: #64748B; display: block;">Price</span>
              <span class="card-price-stat">₹${loc.pricePerHour} / hr</span>
            </div>
          </div>
          <button class="btn-card-book">View & Reserve Slot</button>
        </div>
      </div>
    `).join('');

    // Attach Click Events to Cards
    grid.querySelectorAll('.web-loc-card').forEach(card => {
      card.addEventListener('click', () => {
        const locId = card.dataset.id;
        navigateTo('details', { locationId: locId });
      });
    });
  }

  // Vehicle Category Selector Pills
  const vehiclePills = document.querySelectorAll('.v-pill');
  vehiclePills.forEach(pill => {
    pill.addEventListener('click', () => {
      vehiclePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedVehicleType = pill.dataset.vehicle;
      renderHomeScreen();
      if (state.selectedVehicleType === 'All') {
        showToast('Showing all spots for all vehicle types');
      } else {
        showToast(`Filtering for: ${state.selectedVehicleType}`);
      }
    });
  });

  // Global Search Input
  const webSearchInput = document.getElementById('web-search-input');
  if (webSearchInput) {
    webSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      renderHomeScreen();
    });
  }

  // Voice Search
  const btnVoiceSearch = document.getElementById('btn-voice-search');
  if (btnVoiceSearch) {
    btnVoiceSearch.addEventListener('click', () => {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        showToast('🎙️ Listening... speak parking area name');
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new SpeechRec();
        rec.onresult = (evt) => {
          const transcript = evt.results[0][0].transcript;
          if (webSearchInput) webSearchInput.value = transcript;
          state.searchQuery = transcript;
          renderHomeScreen();
          showToast(`Searching for: "${transcript}"`);
        };
        rec.onerror = () => showToast('Could not access microphone.');
        rec.start();
      } else {
        showToast('Speech recognition not supported in this browser.');
      }
    });
  }

  // Home Shortcuts to Map
  const btnSeeAllMap = document.getElementById('btn-see-all-map');
  if (btnSeeAllMap) btnSeeAllMap.addEventListener('click', () => navigateTo('map'));

  const btnPromoFindMap = document.getElementById('btn-promo-find-map');
  if (btnPromoFindMap) btnPromoFindMap.addEventListener('click', () => navigateTo('map'));

  // Notification Button
  const btnDashNotif = document.getElementById('btn-dash-notif');
  if (btnDashNotif) {
    btnDashNotif.addEventListener('click', () => {
      alert('🔔 Notifications:\n• Special Offer: 20% discount on 4-hour bookings at City Mall Parking today!\n• Fastag auto-debit enabled.');
    });
  }

  // ================= PAGE 5: FIND PARKING / INTERACTIVE MAP ================= //
  async function initOrRefreshMap() {
    const mapContainer = document.getElementById('leaflet-map-web');
    if (!mapContainer) return;

    const userCoords = window.parkingDataService.getUserLocation();
    const locations = await window.parkingDataService.getLocations(userCoords);
    const mapCenter = [userCoords.lat || 12.3088, userCoords.lng || 76.6521];

    if (!state.mapInstance) {
      state.mapInstance = L.map('leaflet-map-web', {
        zoomControl: true
      }).setView(mapCenter, 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(state.mapInstance);
    } else {
      setTimeout(() => {
        state.mapInstance.invalidateSize();
        state.mapInstance.setView(mapCenter, 14);
      }, 250);
    }

    // Clear old markers
    state.mapMarkers.forEach(m => state.mapInstance.removeLayer(m));
    state.mapMarkers = [];

    // User location pulsing marker
    const userIcon = L.divIcon({
      className: 'user-pulse-pin',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    const userMarker = L.marker(mapCenter, { icon: userIcon }).addTo(state.mapInstance);
    state.mapMarkers.push(userMarker);

    // Add P markers
    locations.forEach(loc => {
      const pinClass = loc.availableSlots > 5 ? 'green' : 'red';
      const customIcon = L.divIcon({
        className: `custom-p-pin ${pinClass}`,
        html: `<span>P</span>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(state.mapInstance);

      marker.on('click', () => {
        state.selectedLocation = loc;
        updateMapSelectedCard(loc);
        highlightSidebarSpot(loc.id);
        state.mapInstance.panTo([loc.lat, loc.lng]);
      });

      state.mapMarkers.push(marker);
    });

    // Populate Sidebar spots list
    renderMapSidebar(locations);

    // Initial selected card
    const initialLoc = state.selectedLocation || locations[0];
    updateMapSelectedCard(initialLoc);
  }

  function renderMapSidebar(locations) {
    const list = document.getElementById('map-sidebar-spots-list');
    const countEl = document.getElementById('sidebar-slots-count');
    if (!list) return;

    if (countEl) countEl.textContent = `${locations.length} Locations`;

    list.innerHTML = locations.map(loc => `
      <div class="sidebar-spot-item" data-id="${loc.id}">
        <img src="${loc.image}" alt="${loc.name}" class="spot-mini-thumb" onerror="this.src='assets/images/city_mall.jpg'" />
        <div class="spot-mini-info">
          <div class="spot-mini-name">${loc.name}</div>
          <div class="spot-mini-sub">${loc.distanceKm} km • ₹${loc.pricePerHour}/hr</div>
          <div class="spot-mini-slots">${loc.availableSlots} slots open</div>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.sidebar-spot-item').forEach(item => {
      item.addEventListener('click', () => {
        const loc = locations.find(l => l.id === item.dataset.id);
        if (loc) {
          state.selectedLocation = loc;
          updateMapSelectedCard(loc);
          highlightSidebarSpot(loc.id);
          if (state.mapInstance) state.mapInstance.panTo([loc.lat, loc.lng]);
        }
      });
    });
  }

  function highlightSidebarSpot(id) {
    document.querySelectorAll('.sidebar-spot-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.id === id);
    });
  }

  function updateMapSelectedCard(loc) {
    const card = document.getElementById('map-selected-card');
    if (!card || !loc) return;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <div>
          <h4 style="font-size: 16px; font-weight: 800; color: #0F172A;">${loc.name}</h4>
          <span style="font-size: 13px; color: #64748B;">${loc.distance}</span>
        </div>
        <div style="background: #127447; color: #FFF; font-size: 12px; font-weight: 800; padding: 4px 10px; border-radius: 9999px;">
          ₹${loc.pricePerHour}/hr
        </div>
      </div>
      <div style="font-size: 13px; color: #D97706; font-weight: 700; margin-bottom: 8px;">
        ★ ${loc.rating} <span style="color: #64748B; font-weight: 400;">(${loc.reviewsCount} reviews) • ${loc.availableSlots} available</span>
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;">
        <span class="badge-mini-v">🚗 Cars</span>
        <span class="badge-mini-v">🏍️ Bikes</span>
        <span class="badge-mini-v">🚛 Trucks</span>
        <span class="badge-mini-v">⚡ EVs</span>
      </div>
      <div style="display: flex; gap: 10px;">
        <button class="btn-primary-web" id="btn-map-book-now" style="flex: 1; padding: 10px 16px; font-size: 13px;">View & Book</button>
        <button class="btn-secondary-web" id="btn-map-directions" style="padding: 10px 14px; font-size: 13px;" title="Navigate">🧭 Directions</button>
      </div>
    `;

    document.getElementById('btn-map-book-now').addEventListener('click', () => {
      state.selectedLocation = loc;
      navigateTo('details', { locationId: loc.id });
    });

    document.getElementById('btn-map-directions').addEventListener('click', () => {
      showToast(`🧭 Opening live GPS route to ${loc.name}...`);
    });
  }

  // GPS Map Center Button
  const btnWebGps = document.getElementById('btn-web-gps');
  if (btnWebGps) {
    btnWebGps.addEventListener('click', async () => {
      showToast('📍 Detecting GPS & centering map...');
      await detectUserLocation(false);
      const userCoords = window.parkingDataService.getUserLocation();
      if (state.mapInstance && userCoords.lat && userCoords.lng) {
        state.mapInstance.flyTo([userCoords.lat, userCoords.lng], 15, { animate: true, duration: 1.2 });
        showToast(`📍 Centered on ${userCoords.areaName}`);
      }
    });
  }

  // ================= PAGE 6: PARKING DETAILS FLOW ================= //
  async function renderDetailsPage(locationId) {
    const loc = await window.parkingDataService.getLocationById(locationId);
    state.selectedLocation = loc;

    const imgEl = document.getElementById('web-details-img');
    const nameEl = document.getElementById('web-details-name');
    const addrEl = document.getElementById('web-details-address');
    const ratingEl = document.getElementById('web-details-rating');
    const slotsEl = document.getElementById('web-details-slots');
    const priceEl = document.getElementById('web-details-price');
    const hoursEl = document.getElementById('web-details-hours');

    if (imgEl) imgEl.src = loc.image;
    if (nameEl) nameEl.textContent = loc.name;
    if (addrEl) addrEl.textContent = loc.address;
    if (ratingEl) ratingEl.innerHTML = `★ ${loc.rating} <span>(${loc.reviewsCount} reviews)</span>`;
    if (slotsEl) slotsEl.textContent = `${loc.availableSlots} / ${loc.totalSlots}`;
    if (priceEl) priceEl.textContent = `₹${loc.pricePerHour} / hour`;
    if (hoursEl) hoursEl.textContent = loc.openHours;

    const btnBook = document.getElementById('btn-web-book-slot');
    if (btnBook) {
      btnBook.onclick = () => {
        navigateTo('book', { locationId: loc.id });
      };
    }
  }

  // ================= PAGE 7: BOOK PARKING SLOT (RESERVATION) ================= //
  async function initBookingForm(locationId) {
    const loc = await window.parkingDataService.getLocationById(locationId);
    state.selectedLocation = loc;

    const user = window.parkingDataService.getUser();

    const locNameEl = document.getElementById('book-form-loc-name');
    const rateBadgeEl = document.getElementById('book-form-rate-badge');
    const vehicleTypeSelect = document.getElementById('web-book-vehicle-type');
    const vehicleNumInput = document.getElementById('web-book-vehicle-num');
    const contactInput = document.getElementById('web-book-contact');
    const dateInput = document.getElementById('web-book-date');
    const durationSelect = document.getElementById('web-book-duration');
    const totalDisplay = document.getElementById('web-book-total-amount');
    const formulaDisplay = document.getElementById('calc-formula');

    if (locNameEl) locNameEl.textContent = loc.name;
    if (rateBadgeEl) rateBadgeEl.textContent = `₹${loc.pricePerHour} / hr`;
    if (vehicleTypeSelect) {
      if (state.selectedVehicleType && state.selectedVehicleType !== 'All') {
        vehicleTypeSelect.value = state.selectedVehicleType;
      } else {
        vehicleTypeSelect.value = 'Car';
      }
    }
    if (vehicleNumInput) {
      vehicleNumInput.value = (user.vehicles && user.vehicles[0]) ? user.vehicles[0].number : 'KA 01 AB 1234';
    }
    if (contactInput) {
      contactInput.value = user.phone ? user.phone.replace('+91 ', '') : '9876543210';
    }
    if (dateInput) dateInput.value = '11 Sep 2026';
    if (durationSelect) durationSelect.value = '2';

    function calculateTotal() {
      const hours = parseInt(durationSelect.value) || 1;
      const rate = loc.pricePerHour || 20;
      const total = hours * rate;
      if (totalDisplay) totalDisplay.textContent = `₹${total}`;
      if (formulaDisplay) formulaDisplay.textContent = `₹${rate} / hr × ${hours} Hour${hours > 1 ? 's' : ''}`;
      return total;
    }

    calculateTotal();

    if (durationSelect) durationSelect.onchange = calculateTotal;
    if (vehicleTypeSelect) vehicleTypeSelect.onchange = (e) => {
      state.selectedVehicleType = e.target.value;
    };

    // Confirm Booking Submission
    const btnConfirm = document.getElementById('btn-web-confirm-booking');
    if (btnConfirm) {
      btnConfirm.onclick = async () => {
        const durationHours = parseInt(durationSelect.value) || 2;
        const totalAmount = calculateTotal();
        const vehiclePlate = vehicleNumInput.value.trim() || 'KA 01 AB 1234';
        const contactNum = contactInput.value.trim() || '9876543210';
        const bookingDate = dateInput.value.trim() || '11 Sep 2026';

        if (loc.availableSlots <= 0) {
          showToast('❌ Sorry, this parking facility has zero vacant slots!');
          return;
        }

        btnConfirm.disabled = true;
        btnConfirm.textContent = 'Reserving Slot in Firebase...';

        try {
          const paymentMethodSelect = document.getElementById('web-book-payment-method');
          const chosenMethod = paymentMethodSelect ? paymentMethodSelect.value : 'UPI / QR Code';

          const newBooking = await window.parkingDataService.createBooking({
            locationId: loc.id,
            locationName: loc.name,
            vehicleType: vehicleTypeSelect.value,
            vehicleNumber: vehiclePlate,
            contactNumber: contactNum,
            date: bookingDate,
            time: '10:00 AM',
            duration: `${durationHours} Hours`,
            durationHours: durationHours,
            amountPaid: totalAmount,
            image: loc.image,
            paymentMethod: chosenMethod,
            paymentStatus: (chosenMethod.includes('Parking') || chosenMethod.includes('Gate') || chosenMethod.includes('Cash')) ? 'PAY ON ARRIVAL' : 'PAID (CONFIRMED)'
          });

          state.lastBooking = newBooking;
          showToast('🎉 Booking Confirmed & Synced with Database!');
          navigateTo('confirmed', { booking: newBooking });
        } catch (err) {
          console.error(err);
          showToast('Failed to create booking.');
        } finally {
          btnConfirm.disabled = false;
          btnConfirm.textContent = 'Confirm & Reserve Slot';
        }
      };
    }
  }

  // ================= PAGE 8: BOOKING CONFIRMED FLOW ================= //
  function renderConfirmedPage(booking) {
    if (!booking) return;

    const idEl = document.getElementById('ticket-booking-id');
    const locEl = document.getElementById('ticket-location');
    const plateEl = document.getElementById('ticket-vehicle');
    const datetimeEl = document.getElementById('ticket-datetime');
    const durEl = document.getElementById('ticket-duration');
    const amountEl = document.getElementById('ticket-amount');
    const methodEl = document.getElementById('ticket-payment-method');
    const statusEl = document.getElementById('ticket-payment-status');
    const payAmountEl = document.getElementById('confirmed-pay-amount');
    const successBanner = document.getElementById('payment-success-banner');
    const utrEl = document.getElementById('ticket-utr');
    const utrWrap = document.getElementById('ticket-field-utr');
    const proofWrap = document.getElementById('ticket-field-proof');
    const proofBadge = document.getElementById('ticket-proof-badge');

    function updateTicketReceiptDetails() {
      if (booking.utrNumber) {
        if (utrEl) utrEl.textContent = booking.utrNumber;
        if (utrWrap) utrWrap.style.display = 'flex';
      } else {
        if (utrWrap) utrWrap.style.display = 'none';
      }

      if (booking.paymentScreenshot) {
        if (proofWrap) proofWrap.style.display = 'flex';
        if (proofBadge) {
          proofBadge.onclick = () => {
            if (window.openPaymentProofModal) window.openPaymentProofModal(booking.paymentScreenshot);
          };
        }
      } else {
        if (proofWrap) proofWrap.style.display = 'none';
      }
    }

    if (idEl) idEl.textContent = booking.bookingId;
    if (locEl) locEl.textContent = booking.locationName;
    if (plateEl) plateEl.textContent = booking.vehicleNumber;
    if (datetimeEl) datetimeEl.textContent = `${booking.date}, ${booking.time}`;
    if (durEl) durEl.textContent = booking.duration;
    if (amountEl) amountEl.textContent = `₹${booking.amountPaid}`;
    if (payAmountEl) payAmountEl.textContent = `₹${booking.amountPaid}`;

    let currentPaymentMethod = booking.paymentMethod || 'UPI / QR Code';
    let currentPaymentStatus = booking.paymentStatus || ((currentPaymentMethod.includes('Parking') || currentPaymentMethod.includes('Gate') || currentPaymentMethod.includes('Cash')) ? 'PAY ON ARRIVAL' : 'PAID (CONFIRMED)');

    if (methodEl) methodEl.textContent = currentPaymentMethod;
    if (statusEl) {
      statusEl.textContent = currentPaymentStatus;
      statusEl.className = currentPaymentStatus.includes('PAID') ? 'badge-status-pill success' : 'badge-status-pill warning';
    }

    updateTicketReceiptDetails();

    if (successBanner) successBanner.style.display = 'none';

    // Payment Methods Switcher Logic on Confirmed Page (QR / UPI & Payment at Parking)
    let activeMethod = 'upi';
    if (currentPaymentMethod.includes('Parking') || currentPaymentMethod.includes('Gate') || currentPaymentMethod.includes('Cash')) {
      activeMethod = 'gate';
    } else {
      activeMethod = 'upi';
    }

    const methodCards = document.querySelectorAll('.payment-method-card');
    methodCards.forEach(card => {
      card.classList.toggle('active', card.dataset.method === activeMethod);
      card.onclick = () => {
        activeMethod = card.dataset.method;
        methodCards.forEach(c => c.classList.toggle('active', c === card));
        renderPaymentDynamicPanel(activeMethod, booking.amountPaid);
      };
    });

    let uploadedScreenshot = booking.paymentScreenshot || null;
    let currentUtrNumber = booking.utrNumber || '';

    function renderPaymentDynamicPanel(method, amount) {
      const panel = document.getElementById('payment-dynamic-view');
      const btnPayText = document.getElementById('btn-pay-text');
      if (!panel) return;

      if (method === 'upi') {
        if (btnPayText) btnPayText.textContent = `Confirm & Pay via UPI • ₹${amount}`;

        // Retrieve latest saved payment configuration dynamically
        const currentStored = getStoredPaymentConfig();
        let activeCfg = currentStored.master || {
          upiId: '9676826516@upi',
          payeeName: 'Smart Parking Admin',
          phone: '9676826516',
          status: 'enabled'
        };

        // Facility-level override if configured for this booking's parking facility
        if (booking && booking.locationId && currentStored.facilities && currentStored.facilities[booking.locationId]) {
          activeCfg = currentStored.facilities[booking.locationId];
        }

        const adminPhone = activeCfg.phone || '9676826516';
        const adminName = activeCfg.payeeName || 'Smart Parking Admin';
        let activeVpa = activeCfg.upiId || '9676826516@upi';

        function getUpiSvg(vpa) {
          const uri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(adminName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Parking Reservation')}`;
          try {
            if (window.StandardQRCode && typeof window.StandardQRCode.generateSVG === 'function') {
              return window.StandardQRCode.generateSVG(uri, {
                width: 180,
                height: 180,
                margin: 3,
                darkColor: '#0F172A',
                lightColor: '#FFFFFF'
              });
            }
          } catch (e) {
            console.error('QR generator error:', e);
          }
          return `
            <svg class="standard-upi-qr-svg" width="180" height="180" viewBox="0 0 100 100" fill="none">
              <rect width="100" height="100" fill="#FFFFFF"/>
              <rect x="6" y="6" width="28" height="28" rx="3" fill="#0F172A"/>
              <rect x="10" y="10" width="20" height="20" fill="#FFFFFF"/>
              <rect x="14" y="14" width="12" height="12" fill="#10B981"/>
              <rect x="66" y="6" width="28" height="28" rx="3" fill="#0F172A"/>
              <rect x="70" y="10" width="20" height="20" fill="#FFFFFF"/>
              <rect x="74" y="14" width="12" height="12" fill="#10B981"/>
              <rect x="6" y="66" width="28" height="28" rx="3" fill="#0F172A"/>
              <rect x="10" y="70" width="20" height="20" fill="#FFFFFF"/>
              <rect x="14" y="74" width="12" height="12" fill="#10B981"/>
            </svg>
          `;
        }

        function updateUpiView() {
          const qrSvg = getUpiSvg(activeVpa);

          panel.innerHTML = `
            <div class="upi-box-layout">
              <div class="upi-merchant-standee">
                <!-- Top Brand Header -->
                <div class="upi-standee-header">
                  <div class="upi-brand-badge">
                    <div class="upi-bhim-logo">
                      <span>BHIM</span>
                      <span class="upi-arrow-glyph">▶</span>
                      <span style="color:#10B981;">UPI</span>
                    </div>
                    <span class="upi-bharat-tag">Bharat QR Standard</span>
                  </div>
                  <div class="upi-verified-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span>Verified Admin Merchant</span>
                  </div>
                </div>

                <!-- Standee Body (100% Contained inside the Box) -->
                <div class="upi-standee-body">
                  <!-- Admin Payee Bar -->
                  <div class="upi-payee-card-bar">
                    <div class="upi-payee-info">
                      <div class="upi-payee-name">
                        <span>${escapeHtml(adminName)}</span>
                        <span style="font-size:0.7rem; background:#DCFCE7; color:#15803D; font-weight:800; padding:2px 6px; border-radius:4px;">ADMIN</span>
                      </div>
                      <span class="upi-payee-sub">Scan QR with any UPI app to pay ₹${amount}</span>
                    </div>
                    <div class="upi-payee-badges-row">
                      <button type="button" class="upi-copy-chip highlight-phone" onclick="navigator.clipboard?.writeText('${escapeHtml(adminPhone)}'); window.showToast('📞 Copied Admin Phone: ${escapeHtml(adminPhone)}');">
                        <span>📞 +91 ${escapeHtml(adminPhone)}</span>
                        <span style="font-size:0.7rem; text-decoration:underline;">COPY NO</span>
                      </button>
                      <button type="button" class="upi-copy-chip" onclick="navigator.clipboard?.writeText('${escapeHtml(activeVpa)}'); window.showToast('📋 Copied UPI ID: ${escapeHtml(activeVpa)}');">
                        <span>🆔 ${escapeHtml(activeVpa)}</span>
                        <span style="font-size:0.7rem; text-decoration:underline;">COPY ID</span>
                      </button>
                    </div>
                  </div>

                  <!-- Centered Standard QR Code Box -->
                  <div class="upi-qr-display-box">
                    <div class="upi-qr-frame-wrapper">
                      <span class="qr-viewfinder-corner tl"></span>
                      <span class="qr-viewfinder-corner tr"></span>
                      <span class="qr-viewfinder-corner bl"></span>
                      <span class="qr-viewfinder-corner br"></span>
                      ${qrSvg}
                    </div>
                    <div class="upi-scan-pill">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"></circle><path d="M3 9V5a2 2 0 0 1 2-2h4M15 3h4a2 2 0 0 1 2 2v4M21 15v4a2 2 0 0 1-2 2h-4M9 21H5a2 2 0 0 1-2-2v-4"></path></svg>
                      <span>SCAN TO PAY ₹${amount}</span>
                    </div>
                  </div>

                  <!-- Payment Proof & Screenshot Upload Section -->
                  <div class="payment-proof-upload-section">
                    <div class="proof-upload-header">
                      <div class="proof-icon-bubble" style="width:38px; height:38px; flex-shrink:0;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#127447" stroke-width="2.2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </div>
                      <div>
                        <strong class="proof-title">Upload Payment Screenshot & Enter UTR ID</strong>
                        <p class="proof-subtitle">Upload your payment screenshot below and enter the 12-digit UTR ID to verify payment.</p>
                      </div>
                    </div>

                    <!-- Screenshot File Upload Dropzone -->
                    <div class="proof-dropzone" id="proof-dropzone">
                      <input type="file" id="payment-screenshot-input" accept="image/*" style="display: none;">
                      <div class="proof-dropzone-content" id="proof-dropzone-empty" style="${uploadedScreenshot ? 'display: none;' : 'display: flex;'}">
                        <div class="proof-icon-bubble">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        </div>
                        <div class="proof-drop-text">
                          <span class="proof-primary-text">Click or drag & drop to <strong>upload payment screenshot</strong></span>
                          <span class="proof-secondary-text">Upload your UPI success screenshot (PNG, JPG, WEBP)</span>
                        </div>
                      </div>

                      <div class="proof-preview-wrapper" id="proof-preview-wrapper" style="${uploadedScreenshot ? 'display: flex;' : 'display: none;'}">
                        <img id="proof-preview-img" class="proof-preview-img" src="${uploadedScreenshot || ''}" alt="Payment Screenshot" title="Click to view full size">
                        <div class="proof-preview-details">
                          <span class="proof-filename" id="proof-filename">${booking.screenshotName || 'payment_receipt.png'}</span>
                          <span class="proof-filesize" id="proof-filesize">✓ Screenshot Attached</span>
                          <button type="button" class="btn-remove-proof" id="btn-remove-proof">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Remove / Change Image
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- 12-Digit UTR ID Field -->
                    <div class="upi-ref-input-group">
                      <label class="upi-ref-input-label" for="upi-utr-input">
                        <span>12-Digit UPI Ref / UTR ID</span>
                        <span style="color: #127447; font-weight: 800; font-size: 0.74rem;">(from UPI App Receipt)</span>
                      </label>
                      <div class="upi-ref-row">
                        <input type="text" id="upi-utr-input" class="upi-ref-field" placeholder="Enter 12-digit UTR ID (e.g. 429103847291)" value="${escapeHtml(currentUtrNumber)}" maxlength="18" autocomplete="off">
                        <button type="button" class="btn-primary-web" style="padding: 10px 18px; font-size: 0.85rem; font-weight: 800; white-space: nowrap;" onclick="window.confirmUpiPayment && window.confirmUpiPayment()">
                          ✓ Verify & Confirm
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;

          // Bind dropzone and file input handlers
          const dropzone = panel.querySelector('#proof-dropzone');
          const fileInput = panel.querySelector('#payment-screenshot-input');
          const emptyView = panel.querySelector('#proof-dropzone-empty');
          const previewWrap = panel.querySelector('#proof-preview-wrapper');
          const previewImg = panel.querySelector('#proof-preview-img');
          const filenameEl = panel.querySelector('#proof-filename');
          const filesizeEl = panel.querySelector('#proof-filesize');
          const removeBtn = panel.querySelector('#btn-remove-proof');
          const utrField = panel.querySelector('#upi-utr-input');

          if (utrField) {
            utrField.oninput = (e) => {
              currentUtrNumber = e.target.value.trim();
              booking.utrNumber = currentUtrNumber;
            };
          }

          if (dropzone && fileInput) {
            dropzone.onclick = (e) => {
              if (e.target.closest('#btn-remove-proof')) return;
              if (e.target.closest('#proof-preview-img')) {
                if (window.openPaymentProofModal) window.openPaymentProofModal(previewImg.src);
                return;
              }
              fileInput.click();
            };

            dropzone.ondragover = (e) => {
              e.preventDefault();
              dropzone.classList.add('dragover');
            };

            dropzone.ondragleave = () => {
              dropzone.classList.remove('dragover');
            };

            dropzone.ondrop = (e) => {
              e.preventDefault();
              dropzone.classList.remove('dragover');
              if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFile(e.dataTransfer.files[0]);
              }
            };

            fileInput.onchange = (e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            };
          }

          function handleFile(file) {
            if (!file.type.startsWith('image/')) {
              window.showToast('⚠️ Please upload a valid image file (PNG, JPG, WEBP).');
              return;
            }
            if (file.size > 8 * 1024 * 1024) {
              window.showToast('⚠️ Screenshot size is too large (max 8MB).');
              return;
            }

            const reader = new FileReader();
            reader.onload = (loadEvt) => {
              uploadedScreenshot = loadEvt.target.result;
              booking.paymentScreenshot = uploadedScreenshot;
              booking.screenshotName = file.name;
              if (previewImg) previewImg.src = uploadedScreenshot;
              if (filenameEl) filenameEl.textContent = file.name;
              if (filesizeEl) filesizeEl.textContent = `${(file.size / 1024).toFixed(1)} KB • Attached ✓`;
              if (emptyView) emptyView.style.display = 'none';
              if (previewWrap) previewWrap.style.display = 'flex';
              window.showToast('📸 Payment screenshot attached successfully!');
              updateTicketReceiptDetails();
            };
            reader.readAsDataURL(file);
          }

          if (removeBtn) {
            removeBtn.onclick = (e) => {
              e.stopPropagation();
              uploadedScreenshot = null;
              booking.paymentScreenshot = null;
              booking.screenshotName = null;
              if (fileInput) fileInput.value = '';
              if (previewImg) previewImg.src = '';
              if (emptyView) emptyView.style.display = 'flex';
              if (previewWrap) previewWrap.style.display = 'none';
              window.showToast('🗑️ Payment screenshot removed.');
              updateTicketReceiptDetails();
            };
          }
        }

        updateUpiView();

        window.confirmUpiPayment = function() {
          const btnProcess = document.getElementById('btn-process-payment-now');
          if (btnProcess) btnProcess.click();
        };
      } else if (method === 'gate') {
        if (btnPayText) btnPayText.textContent = `Confirm Payment at Parking • ₹${amount}`;
        panel.innerHTML = `
          <div class="payment-gate-notice">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#127447" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <div>
              <strong style="color: #065F46; font-size: 0.95rem;">Pay on Arrival at Parking Barrier</strong>
              <p style="font-size: 0.85rem; color: #047857; margin: 4px 0 0; line-height: 1.45;">
                Your slot is safely reserved! When arriving at the facility, show this digital pass on your phone to the attendant or scan your QR code at the entrance boom barrier. You can pay via <strong>Cash</strong> or <strong>FASTag</strong> at the parking gate.
              </p>
            </div>
          </div>
        `;
      }
    }

    renderPaymentDynamicPanel(activeMethod, booking.amountPaid);

    // Process Payment Button Handler
    const btnProcessPay = document.getElementById('btn-process-payment-now');
    if (btnProcessPay) {
      btnProcessPay.onclick = () => {
        btnProcessPay.disabled = true;
        btnProcessPay.innerHTML = `<span>Processing Transaction...</span>`;

        setTimeout(async () => {
          btnProcessPay.disabled = false;
          const currentStored = getStoredPaymentConfig();
          const activeCfg = (booking && booking.locationId && currentStored.facilities && currentStored.facilities[booking.locationId])
            ? currentStored.facilities[booking.locationId]
            : (currentStored.master || { upiId: '9676826516@upi' });
          const currentVpa = activeCfg.upiId || '9676826516@upi';
          let methodLabel = `UPI / QR Code (${currentVpa})`;
          let statusLabel = 'PAID (CONFIRMED)';
          if (activeMethod === 'gate') {
            methodLabel = 'Payment at Parking (Cash / FASTag)';
            statusLabel = 'PAY ON ARRIVAL';
          }

          const utrVal = document.getElementById('upi-utr-input') ? document.getElementById('upi-utr-input').value.trim() : (booking.utrNumber || '');
          if (activeMethod === 'upi') {
            if (utrVal) booking.utrNumber = utrVal;
            if (uploadedScreenshot) booking.paymentScreenshot = uploadedScreenshot;
          }

          if (methodEl) methodEl.textContent = methodLabel;
          if (statusEl) {
            statusEl.textContent = statusLabel;
            statusEl.className = statusLabel.includes('PAID') ? 'badge-status-pill success' : 'badge-status-pill warning';
          }

          booking.paymentMethod = methodLabel;
          booking.paymentStatus = statusLabel;

          updateTicketReceiptDetails();

          // Update bookings in storage
          const bookings = await window.parkingDataService.getBookings();
          const target = bookings.find(b => b.id === booking.id || b.bookingId === booking.bookingId);
          if (target) {
            target.paymentMethod = methodLabel;
            target.paymentStatus = statusLabel;
            if (booking.utrNumber) target.utrNumber = booking.utrNumber;
            if (booking.paymentScreenshot) target.paymentScreenshot = booking.paymentScreenshot;
            if (booking.screenshotName) target.screenshotName = booking.screenshotName;
            localStorage.setItem(window.parkingDataService.storageKeyBookings, JSON.stringify(bookings));
          }

          if (successBanner) {
            const titleEl = document.getElementById('psb-title');
            const subEl = document.getElementById('psb-sub');
            const txnRef = booking.utrNumber ? `UTR: ${booking.utrNumber}` : `Ref ID: #TXN_${Math.floor(1000000 + Math.random() * 9000000)}`;
            const screenshotNote = booking.paymentScreenshot ? ' • Screenshot Proof Attached ✓' : '';
            if (titleEl) titleEl.textContent = activeMethod === 'gate' ? 'Pay on Arrival Confirmed!' : 'Payment Verified & Confirmed!';
            if (subEl) subEl.textContent = `Mode: ${methodLabel} • ${txnRef}${screenshotNote}`;
            successBanner.style.display = 'flex';
          }

          renderPaymentDynamicPanel(activeMethod, booking.amountPaid);
          showToast(`🎉 Payment confirmed successfully: ${methodLabel}!`);
        }, 600);
      };
    }

    const btnViewBooking = document.getElementById('btn-web-view-booking');
    if (btnViewBooking) btnViewBooking.onclick = () => navigateTo('bookings');

    const btnGoHome = document.getElementById('btn-web-go-home');
    if (btnGoHome) btnGoHome.onclick = () => navigateTo('home');
  }

  // Global Lightbox Modal for Payment Proof Screenshot
  window.openPaymentProofModal = function(src) {
    if (!src) return;
    let modal = document.getElementById('proof-lightbox-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'proof-lightbox-modal';
      modal.className = 'proof-lightbox-modal';
      modal.innerHTML = `
        <div class="proof-lightbox-backdrop" onclick="document.getElementById('proof-lightbox-modal').style.display='none'"></div>
        <div class="proof-lightbox-box">
          <div class="proof-lightbox-header">
            <strong>Payment Screenshot Proof</strong>
            <button type="button" class="proof-lightbox-close" onclick="document.getElementById('proof-lightbox-modal').style.display='none'">✕</button>
          </div>
          <div class="proof-lightbox-body">
            <img id="proof-lightbox-img" src="" alt="Payment Proof" style="max-width:100%; max-height:75vh; border-radius:6px; object-fit:contain;">
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    const img = modal.querySelector('#proof-lightbox-img');
    if (img) img.src = src;
    modal.style.display = 'flex';
  };

  // ================= PAGE 9: MY BOOKINGS FLOW ================= //
  async function renderBookingsPage() {
    const bookings = await window.parkingDataService.getBookings();
    const container = document.getElementById('web-bookings-list');
    if (!container) return;

    let displayList = [];
    if (state.activeBookingsTab === 'upcoming') {
      displayList = bookings.filter(b => b.status === 'Active');
    } else {
      displayList = bookings.filter(b => b.status === 'Completed' || b.status === 'Cancelled');
    }

    if (displayList.length === 0) {
      container.innerHTML = `
        <div class="empty-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 4px;">No ${state.activeBookingsTab} reservations found</h4>
          <p style="font-size: 13px;">Browse parking locations and book a slot anytime.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = displayList.map(b => {
      const isUpcoming = b.status === 'Active';
      const statusClass = b.status.toLowerCase();

      return `
        <div class="web-booking-card" data-id="${b.id}">
          <div class="bk-card-top">
            <img src="${b.image || 'assets/images/city_mall.jpg'}" alt="${b.locationName}" class="bk-thumb" onerror="this.src='assets/images/city_mall.jpg'" />
            <div class="bk-info">
              <h4 class="bk-name">${b.locationName}</h4>
              <div class="bk-plate">${b.vehicleNumber} (${b.vehicleType || 'Car'})</div>
            </div>
            <span class="badge-status ${statusClass}">${b.status}</span>
          </div>

          <div class="bk-meta-row">
            <div class="bk-meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>${b.date}, ${b.time}</span>
            </div>
            <div class="bk-meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>${b.duration}</span>
            </div>
            <div class="bk-meta-item">
              <strong style="color: #0F172A;">Amount: ₹${b.amountPaid}</strong>
            </div>
          </div>

          <div class="bk-actions-row">
            ${isUpcoming ? `
              <button class="btn-extend-action" data-extend="${b.id}">Extend Duration</button>
              <button class="btn-cancel-action" data-cancel="${b.id}">Cancel Booking</button>
            ` : `
              <button class="btn-extend-action" data-receipt="${b.id}">View Ticket Pass</button>
            `}
          </div>
        </div>
      `;
    }).join('');

    // Cancel Button Listeners
    container.querySelectorAll('[data-cancel]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.cancel;
        if (confirm('Cancel this parking slot reservation? The vacant spot will be restored.')) {
          await window.parkingDataService.cancelBooking(id);
          showToast('Reservation cancelled. Slot restored to database!');
          renderBookingsPage();
        }
      });
    });

    // Extend Button Listeners
    container.querySelectorAll('[data-extend]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.extendingBookingId = btn.dataset.extend;
        if (modalExtend) modalExtend.classList.add('active');
      });
    });

    // View Receipt Button Listeners
    container.querySelectorAll('[data-receipt]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const all = await window.parkingDataService.getBookings();
        const found = all.find(item => item.id === btn.dataset.receipt);
        if (found) {
          state.lastBooking = found;
          navigateTo('confirmed', { booking: found });
        }
      });
    });
  }

  // Segmented Tabs
  const tabUpcoming = document.getElementById('web-tab-upcoming');
  const tabHistory = document.getElementById('web-tab-history');

  if (tabUpcoming && tabHistory) {
    tabUpcoming.addEventListener('click', () => {
      tabUpcoming.classList.add('active');
      tabHistory.classList.remove('active');
      state.activeBookingsTab = 'upcoming';
      renderBookingsPage();
    });

    tabHistory.addEventListener('click', () => {
      tabHistory.classList.add('active');
      tabUpcoming.classList.remove('active');
      state.activeBookingsTab = 'history';
      renderBookingsPage();
    });
  }

  // Confirm Extend Duration in Modal
  const btnConfirmExtend = document.getElementById('btn-web-confirm-extend');
  if (btnConfirmExtend) {
    btnConfirmExtend.addEventListener('click', async () => {
      const extraHours = parseInt(document.getElementById('web-extend-hours-select').value) || 1;
      const extraAmount = extraHours * 20;
      if (state.extendingBookingId) {
        await window.parkingDataService.extendBooking(state.extendingBookingId, extraHours, extraAmount);
        showToast(`✅ Reservation extended by ${extraHours} Hour(s)! Paid ₹${extraAmount}`);
        if (modalExtend) modalExtend.classList.remove('active');
        renderBookingsPage();
      }
    });
  }

  // ================= PAGE 10: PROFILE & SETTINGS FLOW ================= //
  function renderProfilePage() {
    const user = window.parkingDataService.getUser();
    const nameEl = document.getElementById('web-profile-name');
    const phoneEl = document.getElementById('web-profile-phone');
    const emailEl = document.getElementById('web-profile-email');

    if (nameEl) nameEl.textContent = user.fullName;
    if (phoneEl) phoneEl.textContent = user.phone;
    if (emailEl) emailEl.textContent = user.email;

    const btnLogout = document.getElementById('btn-web-logout');
    if (btnLogout) {
      btnLogout.onclick = () => {
        user.isLoggedIn = false;
        window.parkingDataService.saveUser(user);
        showToast('Logged out successfully.');
        navigateTo('splash');
      };
    }
  }

  // Vehicles Menu
  const menuVehicles = document.getElementById('web-menu-vehicles');
  if (menuVehicles) {
    menuVehicles.addEventListener('click', () => {
      const user = window.parkingDataService.getUser();
      const list = user.vehicles.map(v => `• ${v.number} (${v.model || v.type})`).join('\n');
      alert(`My Registered Vehicles:\n\n${list}\n\nYou can add additional vehicles on the booking checkout form.`);
    });
  }

  // Database Settings Menu
  const menuSettings = document.getElementById('web-menu-settings');
  if (menuSettings) {
    menuSettings.addEventListener('click', openFirebaseConfigModal);
  }

  // ================= FIREBASE DATABASE MODAL ================= //
  function openFirebaseConfigModal() {
    if (!modalFirebase) return;
    const config = window.parkingDataService.getFirebaseConfig();
    document.getElementById('cfg-api-key').value = config.apiKey || '';
    document.getElementById('cfg-project-id').value = config.projectId || '';
    document.getElementById('cfg-auth-domain').value = config.authDomain || '';
    document.getElementById('cfg-storage-bucket').value = config.storageBucket || '';
    document.getElementById('cfg-app-id').value = config.appId || '';

    modalFirebase.classList.add('active');
  }

  if (firebaseStatusChip) {
    firebaseStatusChip.addEventListener('click', openFirebaseConfigModal);
  }

  const btnSaveFirebase = document.getElementById('btn-save-firebase-cfg');
  if (btnSaveFirebase) {
    btnSaveFirebase.addEventListener('click', () => {
      const newConfig = {
        apiKey: document.getElementById('cfg-api-key').value.trim(),
        authDomain: document.getElementById('cfg-auth-domain').value.trim(),
        projectId: document.getElementById('cfg-project-id').value.trim(),
        storageBucket: document.getElementById('cfg-storage-bucket').value.trim(),
        appId: document.getElementById('cfg-app-id').value.trim()
      };

      window.parkingDataService.saveFirebaseConfig(newConfig);
    });
  }

  const btnResetDemoData = document.getElementById('btn-reset-demo-data');
  if (btnResetDemoData) {
    btnResetDemoData.addEventListener('click', () => {
      if (confirm('Reset database to initial sample locations and reservations?')) {
        window.parkingDataService.resetAllData();
        showToast('Sample database reset to defaults.');
        if (modalFirebase) modalFirebase.classList.remove('active');
        navigateTo(state.currentPage);
      }
    });
  }

  // Close modals on clicking backdrop
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('active');
    });
  });

  // Helper: HTML entity escaping
  function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ================= ADMIN PORTAL CONTROLLER & SECURITY ================= //
  const AUTHORIZED_ADMIN_EMAIL = 'pcharancharan210@gmail.com';
  const ADMIN_DEFAULT_PASSWORD = '123456789';
  const ADMIN_PHONE_NUMBER = '9676826516';
  const ADMIN_UPI_ID = '9676826516@upi';

  const PAYMENT_CONFIG_STORAGE_KEY = 'smart_parking_upi_config';

  function getStoredPaymentConfig() {
    try {
      const saved = localStorage.getItem(PAYMENT_CONFIG_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      master: {
        upiId: '9676826516@upi',
        payeeName: 'Smart Parking Admin',
        phone: '9676826516',
        status: 'enabled'
      },
      facilities: {}
    };
  }

  function saveStoredPaymentConfig(cfg) {
    try {
      localStorage.setItem(PAYMENT_CONFIG_STORAGE_KEY, JSON.stringify(cfg));
    } catch (e) {}
    window.parkingPaymentConfig = cfg;
  }

  window.parkingPaymentConfig = getStoredPaymentConfig();

  // Back button on Admin Login
  const btnAdminLoginBack = document.getElementById('btn-admin-login-back');
  if (btnAdminLoginBack) {
    btnAdminLoginBack.addEventListener('click', () => navigateTo('splash'));
  }

  // Switch link back to user login from admin login
  const linkAdminToUserLogin = document.getElementById('link-admin-to-user-login');
  if (linkAdminToUserLogin) {
    linkAdminToUserLogin.addEventListener('click', () => navigateTo('login'));
  }

  // Admin Login Submission with Strict Single-Email Validation
  const formAdminLogin = document.getElementById('form-admin-login');
  const adminLoginError = document.getElementById('admin-login-error');

  if (formAdminLogin) {
    formAdminLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('admin-login-email');
      const pwdInput = document.getElementById('admin-login-password');
      const email = emailInput ? emailInput.value.trim() : '';
      const pwd = pwdInput ? pwdInput.value.trim() : '';

      if (adminLoginError) {
        adminLoginError.style.display = 'none';
        adminLoginError.innerHTML = '';
      }

      // CRITICAL CONSTRAINT: Single email allowed only (pcharancharan210@gmail.com)
      if (email.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
        if (adminLoginError) {
          adminLoginError.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <span style="font-size: 1.3rem; line-height: 1;">⛔</span>
              <div>
                <strong>Access Denied: Unauthorized Email Address</strong><br>
                This portal is strictly reserved for the single system administrator.<br>
                Only <strong>${AUTHORIZED_ADMIN_EMAIL}</strong> has access permissions. The email <em>${escapeHtml(email || 'empty')}</em> cannot log in.
              </div>
            </div>
          `;
          adminLoginError.style.display = 'block';
        }
        showToast('⛔ Access Denied: Unauthorized admin email address');
        return;
      }

      // Password Check
      if (pwd !== ADMIN_DEFAULT_PASSWORD) {
        if (adminLoginError) {
          adminLoginError.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <span style="font-size: 1.3rem; line-height: 1;">⚠️</span>
              <div>
                <strong>Invalid Administrator Password</strong><br>
                The master password entered is incorrect. Default admin password is <code>123456789</code>.
              </div>
            </div>
          `;
          adminLoginError.style.display = 'block';
        }
        showToast('⚠️ Invalid administrator password');
        return;
      }

      // Authenticated successfully
      state.isAdmin = true;
      if (adminLoginError) adminLoginError.style.display = 'none';
      showToast('🛡️ Welcome, Administrator! System Control Center active.');
      navigateTo('admin-dashboard');
    });
  }

  // Admin Dashboard: Logout
  const btnAdminLogout = document.getElementById('btn-admin-logout');
  if (btnAdminLogout) {
    btnAdminLogout.addEventListener('click', () => {
      state.isAdmin = false;
      showToast('Administrator session closed.');
      navigateTo('splash');
    });
  }

  // Admin Dashboard: Preview User Dashboard
  const btnAdminViewUserApp = document.getElementById('btn-admin-view-user-app');
  if (btnAdminViewUserApp) {
    btnAdminViewUserApp.addEventListener('click', () => {
      navigateTo('home');
    });
  }

  // Admin Dashboard: Tab Navigation
  const adminTabBtns = document.querySelectorAll('.admin-tab-btn');
  adminTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabTarget = btn.dataset.tab;
      adminTabBtns.forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `admin-tab-${tabTarget}`);
      });
      if (tabTarget === 'payment-settings') {
        window.parkingDataService.getLocations().then(locations => {
          renderAdminPaymentSettings(locations);
        });
      }
    });
  });

  // Admin Dashboard: Data Refresh Buttons
  const btnAdminRefreshSlots = document.getElementById('btn-admin-refresh-slots');
  if (btnAdminRefreshSlots) {
    btnAdminRefreshSlots.addEventListener('click', () => {
      renderAdminDashboard();
      showToast('🔄 Live parking hubs and slot data refreshed!');
    });
  }

  const btnAdminRefreshBookings = document.getElementById('btn-admin-refresh-bookings');
  if (btnAdminRefreshBookings) {
    btnAdminRefreshBookings.addEventListener('click', () => {
      renderAdminDashboard();
      showToast('🔄 Master user reservations refreshed!');
    });
  }

  // Admin Dashboard: Add New Parking Facility Form
  const formAdminAddHub = document.getElementById('form-admin-add-hub');
  if (formAdminAddHub) {
    formAdminAddHub.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-hub-name').value.trim();
      const address = document.getElementById('new-hub-address').value.trim();
      const total = parseInt(document.getElementById('new-hub-total').value) || 50;
      const available = parseInt(document.getElementById('new-hub-available').value) || 25;
      const rate = parseInt(document.getElementById('new-hub-rate').value) || 20;
      const hours = document.getElementById('new-hub-hours').value.trim() || '6:00 AM – 11:00 PM';

      if (!name || !address) {
        showToast('⚠️ Please enter facility name and address');
        return;
      }

      const userLoc = window.parkingDataService.getUserLocation();
      const newHub = {
        name,
        address,
        totalSlots: total,
        availableSlots: Math.min(total, available),
        pricePerHour: rate,
        openHours: hours,
        lat: userLoc.lat + (Math.random() * 0.006 - 0.003),
        lng: userLoc.lng + (Math.random() * 0.006 - 0.003),
        distanceKm: 0.7,
        distance: '0.7 km away'
      };

      await window.parkingDataService.addLocation(newHub);
      formAdminAddHub.reset();
      showToast(`✅ Facility "${name}" successfully registered!`);

      // Switch back to Slots tab and re-render
      const slotsTabBtn = document.querySelector('.admin-tab-btn[data-tab="slots"]');
      if (slotsTabBtn) slotsTabBtn.click();
      renderAdminDashboard();
    });
  }

  // Admin Dashboard: Main Render Function
  async function renderAdminDashboard() {
    const locations = await window.parkingDataService.getLocations();
    const bookings = await window.parkingDataService.getBookings();

    // 1. Calculate Live KPIs
    const totalHubs = locations.length;
    const totalCapacity = locations.reduce((sum, l) => sum + (l.totalSlots || 0), 0);
    const totalAvailable = locations.reduce((sum, l) => sum + (l.availableSlots || 0), 0);
    const activeBookings = bookings.filter(b => b.status === 'Active' || b.status === 'upcoming');
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0);

    const statHubs = document.getElementById('admin-stat-hubs');
    const statAvailable = document.getElementById('admin-stat-available');
    const statBookings = document.getElementById('admin-stat-bookings');
    const statRevenue = document.getElementById('admin-stat-revenue');

    if (statHubs) statHubs.textContent = totalHubs;
    if (statAvailable) statAvailable.textContent = `${totalAvailable} / ${totalCapacity}`;
    if (statBookings) statBookings.textContent = activeBookings.length;
    if (statRevenue) statRevenue.textContent = `₹${totalRevenue}`;

    // 2. Render Live Parking Facilities Table
    const locationsTbody = document.getElementById('admin-locations-tbody');
    if (locationsTbody) {
      if (locations.length === 0) {
        locationsTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748B; padding: 24px;">No parking facilities registered yet.</td></tr>`;
      } else {
        locationsTbody.innerHTML = locations.map(loc => {
          const avail = loc.availableSlots !== undefined ? loc.availableSlots : 0;
          const total = loc.totalSlots || 1;
          const isFull = avail <= 0;
          const pct = Math.round((avail / total) * 100);

          let badge = `<span class="badge-status-pill success">Active</span>`;
          if (isFull) {
            badge = `<span class="badge-status-pill danger">Full</span>`;
          } else if (avail < 5) {
            badge = `<span class="badge-status-pill warning">Low Vacancy</span>`;
          }

          const vehicleBadges = (loc.vehicleTypes || ['Car', 'Bike', 'Truck', 'Others'])
            .map(vt => `<span style="display:inline-block; font-size:0.75rem; background:#F1F5F9; color:#475569; padding:2px 6px; border-radius:4px; margin-right:4px; font-weight:600;">${escapeHtml(vt)}</span>`)
            .join('');

          return `
            <tr>
              <td>
                <div style="font-weight: 700; color: #0F172A; font-size: 0.95rem;">${escapeHtml(loc.name)}</div>
                <div style="font-size: 0.8rem; color: #64748B; margin-top: 2px;">📍 ${escapeHtml(loc.address || 'Central City Area')}</div>
              </td>
              <td>
                <strong style="color: #127447; font-size: 0.95rem;">₹${loc.pricePerHour}/hr</strong>
              </td>
              <td>
                <div style="display: flex; align-items: baseline; gap: 6px;">
                  <strong style="color: ${isFull ? '#DC2626' : '#127447'}; font-size: 1rem;">${avail}</strong>
                  <span style="color: #64748B; font-size: 0.85rem;">/ ${total}</span>
                  <span style="font-size: 0.75rem; color: #64748B;">(${pct}% free)</span>
                </div>
              </td>
              <td>
                <div style="display: flex; flex-wrap: wrap; gap: 4px;">${vehicleBadges}</div>
              </td>
              <td>
                <div class="slot-adjust-actions">
                  <button type="button" class="btn-slot-adjust minus" data-id="${loc.id}" title="Decrease 1 slot" ${isFull ? 'disabled' : ''}>-1</button>
                  <span class="slot-adjust-current">${avail}</span>
                  <button type="button" class="btn-slot-adjust plus" data-id="${loc.id}" title="Increase 1 slot" ${avail >= total ? 'disabled' : ''}>+1</button>
                </div>
              </td>
              <td>${badge}</td>
            </tr>
          `;
        }).join('');

        // Attach slot adjuster click listeners
        locationsTbody.querySelectorAll('.btn-slot-adjust').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const locId = btn.dataset.id;
            const isPlus = btn.classList.contains('plus');
            const delta = isPlus ? 1 : -1;
            await window.parkingDataService.updateLocationSlots(locId, delta);
            showToast(isPlus ? '➕ Slot added to parking facility' : '➖ Slot reduced from facility');
            renderAdminDashboard();
          });
        });
      }
    }

    // 3. Render Master User Reservations Table
    const bookingsTbody = document.getElementById('admin-bookings-tbody');
    if (bookingsTbody) {
      if (bookings.length === 0) {
        bookingsTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748B; padding: 24px;">No customer bookings recorded yet.</td></tr>`;
      } else {
        bookingsTbody.innerHTML = bookings.map(b => {
          const isActive = b.status === 'Active' || b.status === 'upcoming';
          const isCancelled = b.status === 'Cancelled';
          const badgeClass = isActive ? 'success' : (isCancelled ? 'danger' : 'neutral');

          return `
            <tr>
              <td><code style="font-weight: 700; color: #1E293B; background: #F1F5F9; padding: 3px 6px; border-radius: 4px;">${escapeHtml(b.bookingId || b.id)}</code></td>
              <td><strong>${escapeHtml(b.locationName || 'Smart Parking')}</strong></td>
              <td>${escapeHtml(b.contactNumber || '9876543210')}</td>
              <td>
                <div style="font-weight: 600; color: #0F172A;">${escapeHtml(b.vehicleType || 'Car')}</div>
                <div style="font-size: 0.75rem; color: #64748B;">${escapeHtml(b.vehicleNumber || '—')}</div>
              </td>
              <td>
                <div style="font-size: 0.85rem; font-weight: 500;">${escapeHtml(b.date || 'Today')}</div>
                <div style="font-size: 0.75rem; color: #64748B;">${escapeHtml(b.time || '10:00 AM')} (${escapeHtml(b.duration || '2 hrs')})</div>
              </td>
              <td><strong style="color: #127447; font-size: 0.95rem;">₹${b.amountPaid || 0}</strong></td>
              <td><span class="badge-status-pill ${badgeClass}">${escapeHtml(b.status || 'Active')}</span></td>
              <td>
                ${isActive ? `
                  <button type="button" class="btn-table-cancel admin-btn-cancel-booking" data-id="${escapeHtml(b.id || b.bookingId)}">
                    Cancel & Free Slot
                  </button>
                ` : `<span style="font-size: 0.8rem; color: #94A3B8;">No action</span>`}
              </td>
            </tr>
          `;
        }).join('');

        // Attach cancel booking listeners
        bookingsTbody.querySelectorAll('.admin-btn-cancel-booking').forEach(btn => {
          btn.addEventListener('click', async () => {
            const bookingId = btn.dataset.id;
            if (confirm(`Admin Action: Cancel booking ${bookingId} and restore 1 available slot to facility?`)) {
              await window.parkingDataService.cancelBooking(bookingId);
              showToast(`Booking ${bookingId} cancelled and slot released.`);
              renderAdminDashboard();
            }
          });
        });
      }
    }

    // 4. Render Admin Payment Settings & Dynamic Real QR Code
    renderAdminPaymentSettings(locations);
  }

  // ================= ADMIN PAYMENT SETTINGS & REAL QR CONTROLLER ================= //
  let adminPaymentSettingsInitialized = false;

  function renderAdminPaymentSettings(locations) {
    const kpiFacilities = document.getElementById('admin-upi-kpi-facilities');
    const kpiEnabled = document.getElementById('admin-upi-kpi-enabled');
    const kpiPaused = document.getElementById('admin-upi-kpi-paused');
    const facilitySelect = document.getElementById('admin-upi-facility-select');
    const inputUpiId = document.getElementById('admin-upi-id-input');
    const inputPayeeName = document.getElementById('admin-upi-payee-name');
    const inputPhone = document.getElementById('admin-upi-phone-input');
    const selectStatus = document.getElementById('admin-upi-status-select');
    const previewName = document.getElementById('admin-preview-payee-name');
    const previewVpa = document.getElementById('admin-preview-vpa-val');
    const qrContainer = document.getElementById('admin-upi-qr-container');

    if (!facilitySelect) return;

    const cfg = getStoredPaymentConfig();

    // 1. KPI Stats
    const totalCount = locations.length || 4;
    const isMasterEnabled = cfg.master.status !== 'disabled';
    if (kpiFacilities) kpiFacilities.textContent = totalCount;
    if (kpiEnabled) kpiEnabled.textContent = isMasterEnabled ? totalCount : 0;
    if (kpiPaused) kpiPaused.textContent = isMasterEnabled ? 0 : totalCount;

    // 2. Populate Facility dropdown
    const currentVal = facilitySelect.value || 'all';
    facilitySelect.innerHTML = `
      <option value="all">🏢 Global Master (All Parking Facilities)</option>
      ${locations.map(loc => `<option value="${loc.id}">📍 ${escapeHtml(loc.name)}</option>`).join('')}
    `;
    facilitySelect.value = currentVal;

    // 3. Load active values for currently selected facility
    function loadSelectedFacilityConfig() {
      const selectedId = facilitySelect.value;
      let activeData = cfg.master;
      if (selectedId !== 'all' && cfg.facilities && cfg.facilities[selectedId]) {
        activeData = cfg.facilities[selectedId];
      }

      if (inputUpiId) inputUpiId.value = activeData.upiId || '9676826516@upi';
      if (inputPayeeName) inputPayeeName.value = activeData.payeeName || (selectedId === 'all' ? 'Smart Parking Admin' : (locations.find(l => l.id === selectedId)?.name || 'Smart Parking'));
      if (inputPhone) inputPhone.value = activeData.phone || '9676826516';
      if (selectStatus) selectStatus.value = activeData.status || 'enabled';

      updateQrPreview();
    }

    // 4. Real-time Live QR Generator function
    function updateQrPreview() {
      const upiId = (inputUpiId ? inputUpiId.value.trim() : '') || '9676826516@upi';
      const payee = (inputPayeeName ? inputPayeeName.value.trim() : '') || 'Smart Parking Admin';

      if (previewName) previewName.textContent = payee;
      if (previewVpa) previewVpa.textContent = upiId;

      if (qrContainer) {
        const uri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payee)}&am=40&cu=INR&tn=${encodeURIComponent('Parking Reservation')}`;
        try {
          if (window.StandardQRCode && typeof window.StandardQRCode.generateSVG === 'function') {
            qrContainer.innerHTML = window.StandardQRCode.generateSVG(uri, {
              width: 200,
              height: 200,
              margin: 2,
              darkColor: '#0F172A',
              lightColor: '#FFFFFF'
            });
          }
        } catch (err) {
          console.error('Error generating preview QR SVG:', err);
        }
      }
    }

    // Initial load of QR preview
    loadSelectedFacilityConfig();

    // 5. Wire up listeners once
    if (!adminPaymentSettingsInitialized) {
      adminPaymentSettingsInitialized = true;

      // Real-time typing update
      [inputUpiId, inputPayeeName, inputPhone].forEach(input => {
        if (input) {
          input.addEventListener('input', updateQrPreview);
        }
      });

      if (facilitySelect) {
        facilitySelect.addEventListener('change', loadSelectedFacilityConfig);
      }

      // Save Button Handler
      const formUpiConfig = document.getElementById('form-admin-upi-config');
      const btnSaveUpi = document.getElementById('btn-save-upi-config');

      async function handleSaveUpiConfig(e) {
        if (e) e.preventDefault();
        const selectedId = facilitySelect.value;
        const upiId = inputUpiId.value.trim() || '9676826516@upi';
        const payeeName = inputPayeeName.value.trim() || 'Smart Parking Admin';
        const phone = inputPhone.value.trim() || '9676826516';
        const status = selectStatus.value;

        const updatedCfg = getStoredPaymentConfig();
        if (selectedId === 'all') {
          updatedCfg.master = { upiId, payeeName, phone, status };
        } else {
          if (!updatedCfg.facilities) updatedCfg.facilities = {};
          updatedCfg.facilities[selectedId] = { upiId, payeeName, phone, status };
        }

        saveStoredPaymentConfig(updatedCfg);
        updateQrPreview();

        // Broadcast change event for instant dynamic sync
        window.dispatchEvent(new CustomEvent('smart_parking_payment_config_changed', { detail: updatedCfg }));

        // Automatically update customer payment side immediately
        if (state.lastBooking) {
          renderConfirmedPage(state.lastBooking);
        }

        showToast('✅ Payment Configuration Saved! Automatically updated on user payment page.');
      }

      if (formUpiConfig) formUpiConfig.addEventListener('submit', handleSaveUpiConfig);
      if (btnSaveUpi) btnSaveUpi.addEventListener('click', handleSaveUpiConfig);

      // Copy UPI ID button
      const btnCopyVpa = document.getElementById('btn-admin-preview-copy-vpa');
      if (btnCopyVpa) {
        btnCopyVpa.addEventListener('click', () => {
          const vpa = inputUpiId.value.trim() || '9676826516@upi';
          navigator.clipboard?.writeText(vpa);
          showToast(`📋 Copied UPI ID: ${vpa}`);
        });
      }

      // Test scannability button
      const btnTestQr = document.getElementById('btn-admin-preview-test-qr');
      if (btnTestQr) {
        btnTestQr.addEventListener('click', () => {
          const vpa = inputUpiId.value.trim() || '9676826516@upi';
          const payee = inputPayeeName.value.trim() || 'Smart Parking Admin';
          const uri = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(payee)}&am=40&cu=INR&tn=${encodeURIComponent('Parking Reservation')}`;
          navigator.clipboard?.writeText(uri);
          showToast('🔍 QR Payload URI copied! Scannable on any UPI mobile app.');
        });
      }
    }
  }

  // Automatic cross-tab and cross-view payment config synchronizer
  function handlePaymentConfigUpdate() {
    window.parkingPaymentConfig = getStoredPaymentConfig();
    const confirmedPage = document.getElementById('page-confirmed');
    if (confirmedPage && (confirmedPage.classList.contains('active') || state.currentPage === 'confirmed')) {
      if (state.lastBooking) {
        renderConfirmedPage(state.lastBooking);
      }
    }
  }

  window.addEventListener('storage', (e) => {
    if (e.key === PAYMENT_CONFIG_STORAGE_KEY) {
      handlePaymentConfigUpdate();
    }
  });

  window.addEventListener('smart_parking_payment_config_changed', () => {
    handlePaymentConfigUpdate();
  });

  // Subscribe to Data Changes (Auto-re-render)
  window.parkingDataService.subscribe(() => {
    if (state.currentPage === 'home') renderHomeScreen();
    if (state.currentPage === 'bookings') renderBookingsPage();
    if (state.currentPage === 'admin-dashboard') renderAdminDashboard();
  });

  // Initial Step 1: Landing Page (Splash)
  navigateTo('splash');

  // Background Auto-Detection of Real Location on Startup
  setTimeout(() => {
    detectUserLocation(false);
  }, 1000);
});
