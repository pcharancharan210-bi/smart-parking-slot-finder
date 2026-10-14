/**
 * Firebase & Data Layer Configuration
 * Smart Parking Slot Finder
 * 
 * Supports both Live Firebase (Firestore + Auth) and 
 * an automatic LocalStore offline-first fallback.
 */

// Default Firebase Configuration (Users can update via UI or directly here)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDemoDummyApiKeyForSmartParkingApp",
  authDomain: "smart-parking-demo.firebaseapp.com",
  projectId: "smart-parking-demo",
  storageBucket: "smart-parking-demo.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789"
};

// Initial Seed Locations matching the design in the image
const SEED_LOCATIONS = [
  {
    id: "city-mall",
    name: "City Mall Parking",
    distance: "2.5 km away",
    distanceKm: 2.5,
    rating: 4.5,
    reviewsCount: 120,
    address: "MG Road, Mysore",
    availableSlots: 25,
    totalSlots: 50,
    pricePerHour: 20,
    openHours: "6:00 AM – 11:00 PM",
    image: "assets/images/city_mall.jpg",
    facilities: ["All-Vehicle Bays", "CCTV", "Security", "EV Charging", "Washroom"],
    lat: 12.3051,
    lng: 76.6554,
    pinType: "green", // Available
    vehicleTypes: ["Car", "Bike", "Truck", "Others"]
  },
  {
    id: "metro-station",
    name: "Metro Station Parking",
    distance: "1.8 km away",
    distanceKm: 1.8,
    rating: 4.3,
    reviewsCount: 85,
    address: "Station Road, Mysore",
    availableSlots: 12,
    totalSlots: 30,
    pricePerHour: 15,
    openHours: "5:00 AM – 11:30 PM",
    image: "assets/images/metro_station.jpg",
    facilities: ["All-Vehicle Bays", "CCTV", "Security", "Washroom"],
    lat: 12.3142,
    lng: 76.6480,
    pinType: "green", // Available
    vehicleTypes: ["Car", "Bike", "Truck", "Others"]
  },
  {
    id: "it-park",
    name: "IT Tech Park",
    distance: "3.2 km away",
    distanceKm: 3.2,
    rating: 4.7,
    reviewsCount: 95,
    address: "Hebbal Industrial Area, Mysore",
    availableSlots: 8,
    totalSlots: 40,
    pricePerHour: 30,
    openHours: "24 Hours Open",
    image: "assets/images/it_park.jpg",
    facilities: ["All-Vehicle Bays", "CCTV", "Security", "EV Charging", "Washroom"],
    lat: 12.3382,
    lng: 76.6190,
    pinType: "green", // Available
    vehicleTypes: ["Car", "Bike", "Truck", "Others"]
  },
  {
    id: "central-market",
    name: "Central Market Hub",
    distance: "0.9 km away",
    distanceKm: 0.9,
    rating: 3.9,
    reviewsCount: 64,
    address: "Sayyaji Rao Road, Mysore",
    availableSlots: 2,
    totalSlots: 20,
    pricePerHour: 10,
    openHours: "7:00 AM – 10:00 PM",
    image: "assets/images/city_mall.jpg",
    facilities: ["All-Vehicle Bays", "CCTV", "Security"],
    lat: 12.3088,
    lng: 76.6521,
    pinType: "red", // Limited/Busy
    vehicleTypes: ["Car", "Bike", "Truck", "Others"]
  }
];

// Initial Seed Bookings matching Screen 9
const SEED_BOOKINGS = [
  {
    id: "booking-1",
    bookingId: "#SPF123456",
    locationId: "city-mall",
    locationName: "City Mall Parking",
    vehicleType: "Car",
    vehicleNumber: "KA 01 AB 1234",
    contactNumber: "9876543210",
    date: "11 Sep 2026",
    time: "10:00 AM",
    duration: "2 Hours",
    durationHours: 2,
    amountPaid: 40,
    status: "Active", // "Active" | "Completed" | "Cancelled"
    image: "assets/images/city_mall.jpg",
    createdAt: new Date("2026-09-11T09:30:00").toISOString()
  },
  {
    id: "booking-2",
    bookingId: "#SPF987654",
    locationId: "metro-station",
    locationName: "Metro Station Parking",
    vehicleType: "Car",
    vehicleNumber: "KA 01 CD 5678",
    contactNumber: "9876543210",
    date: "10 Sep 2026",
    time: "4:00 PM",
    duration: "1 Hour",
    durationHours: 1,
    amountPaid: 15,
    status: "Completed",
    image: "assets/images/metro_station.jpg",
    createdAt: new Date("2026-09-10T15:00:00").toISOString()
  }
];

// Seed User Profile matching Screen 10
const SEED_USER = {
  fullName: "Aarav Mehta",
  phone: "+91 9876543210",
  email: "aarav@example.com",
  isLoggedIn: true,
  vehicles: [
    { type: "Car", number: "KA 01 AB 1234", model: "Hyundai Creta" },
    { type: "Bike", number: "KA 01 CD 5678", model: "Honda Activa 6G" }
  ]
};

// Data Layer Service with Firebase and LocalStorage Fallback
class ParkingDataService {
  constructor() {
    this.isFirebaseReady = false;
    this.firebaseApp = null;
    this.firestore = null;
    this.auth = null;
    this.listeners = [];
    this.storageKeyLocations = "smart_parking_locations_v2";
    this.storageKeyBookings = "smart_parking_bookings_v1";
    this.storageKeyUser = "smart_parking_user_v1";
    this.storageKeyConfig = "smart_parking_firebase_config_v1";

    this.initLocalStorage();
    this.initFirebase();
  }

  // Initialize LocalStorage with seeds if empty
  initLocalStorage() {
    if (!localStorage.getItem(this.storageKeyLocations)) {
      localStorage.setItem(this.storageKeyLocations, JSON.stringify(SEED_LOCATIONS));
    }
    if (!localStorage.getItem(this.storageKeyBookings)) {
      localStorage.setItem(this.storageKeyBookings, JSON.stringify(SEED_BOOKINGS));
    }
    if (!localStorage.getItem(this.storageKeyUser)) {
      localStorage.setItem(this.storageKeyUser, JSON.stringify(SEED_USER));
    }
  }

  // Initialize Firebase if credentials exist
  initFirebase() {
    const savedConfigStr = localStorage.getItem(this.storageKeyConfig);
    let config = null;

    if (savedConfigStr) {
      try {
        config = JSON.parse(savedConfigStr);
      } catch (e) {
        console.warn("Invalid saved Firebase config:", e);
      }
    }

    if (!config && window.FIREBASE_CUSTOM_CONFIG) {
      config = window.FIREBASE_CUSTOM_CONFIG;
    }

    // Try initializing Firebase compat SDK if available
    if (typeof firebase !== "undefined" && config && config.apiKey && !config.apiKey.includes("Dummy")) {
      try {
        if (!firebase.apps.length) {
          this.firebaseApp = firebase.initializeApp(config);
        } else {
          this.firebaseApp = firebase.app();
        }
        this.firestore = firebase.firestore();
        this.auth = firebase.auth();
        this.isFirebaseReady = true;
        console.log("🔥 Connected to Firebase Firestore successfully!");
        this.syncFirestoreSeeds();
      } catch (err) {
        console.warn("Firebase initialization warning (using local store fallback):", err);
        this.isFirebaseReady = false;
      }
    } else {
      this.isFirebaseReady = false;
      console.log("⚡ Using Fast In-Browser Reactive Data Engine with Firestore Schema.");
    }
  }

  saveFirebaseConfig(config) {
    localStorage.setItem(this.storageKeyConfig, JSON.stringify(config));
    window.location.reload();
  }

  getFirebaseConfig() {
    const saved = localStorage.getItem(this.storageKeyConfig);
    return saved ? JSON.parse(saved) : DEFAULT_FIREBASE_CONFIG;
  }

  // Seed Firestore if online and collection is empty
  async syncFirestoreSeeds() {
    if (!this.isFirebaseReady || !this.firestore) return;
    try {
      const snap = await this.firestore.collection("parking_locations").get();
      if (snap.empty) {
        const batch = this.firestore.batch();
        for (const loc of SEED_LOCATIONS) {
          const ref = this.firestore.collection("parking_locations").doc(loc.id);
          batch.set(ref, loc);
        }
        for (const b of SEED_BOOKINGS) {
          const bRef = this.firestore.collection("bookings").doc(b.id);
          batch.set(bRef, b);
        }
        await batch.commit();
        console.log("🔥 Initial seed data written to Firestore!");
      }
    } catch (err) {
      console.warn("Could not sync Firestore seeds:", err);
    }
  }

  // Spherical Haversine distance in kilometers
  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 1.5;
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  // Set & cache user detected location
  setUserLocation(lat, lng, areaName = "Nearby Area") {
    this.userLocation = { lat, lng, areaName };
    localStorage.setItem("smart_parking_user_coords", JSON.stringify(this.userLocation));
    this.notifyChange();
  }

  // Get user coordinates (or default to Mysore center)
  getUserLocation() {
    const saved = localStorage.getItem("smart_parking_user_coords");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { lat: 12.3088, lng: 76.6521, areaName: "Mysore Central" };
  }

  // Generate duplicate parking areas around specific coordinates
  generateNearbyDuplicateParking(userLat, userLng, areaName = "Nearby", count = 4) {
    const templates = [
      {
        suffix: "Smart City Parking Hub",
        rate: 20,
        totalSlots: 45,
        img: "assets/images/city_mall.jpg",
        facilities: ["CCTV", "Security", "EV Charging", "Washroom"],
        dLat: 0.0035,
        dLng: 0.0042
      },
      {
        suffix: "Metro Transit Multi-Level Parking",
        rate: 15,
        totalSlots: 35,
        img: "assets/images/metro_station.jpg",
        facilities: ["CCTV", "Security", "Washroom"],
        dLat: -0.0045,
        dLng: 0.0032
      },
      {
        suffix: "Commercial Towers Parking Plaza",
        rate: 25,
        totalSlots: 50,
        img: "assets/images/it_park.jpg",
        facilities: ["CCTV", "Security", "EV Charging", "Washroom"],
        dLat: 0.0058,
        dLng: -0.0048
      },
      {
        suffix: "Express Public Parking Bay",
        rate: 10,
        totalSlots: 30,
        img: "assets/images/city_mall.jpg",
        facilities: ["CCTV", "Security"],
        dLat: -0.0062,
        dLng: -0.0038
      },
      {
        suffix: "Grand Galleria Underground Parking B2",
        rate: 30,
        totalSlots: 60,
        img: "assets/images/it_park.jpg",
        facilities: ["CCTV", "Security", "EV Charging", "Washroom"],
        dLat: 0.0022,
        dLng: -0.0075
      }
    ];

    const generated = [];
    for (let i = 0; i < Math.min(count, templates.length); i++) {
      const tmpl = templates[i];
      const spotLat = userLat + tmpl.dLat;
      const spotLng = userLng + tmpl.dLng;
      const dist = this.calculateDistanceKm(userLat, userLng, spotLat, spotLng);
      const openSlots = Math.floor(Math.random() * 25) + 10; // 10 to 34 slots guaranteed

      generated.push({
        id: `loc-gen-${Date.now()}-${i}`,
        name: `${areaName} ${tmpl.suffix}`,
        distance: `${dist} km away`,
        distanceKm: dist,
        rating: +(4.2 + (Math.random() * 0.7)).toFixed(1),
        reviewsCount: Math.floor(40 + Math.random() * 120),
        address: `${areaName} Main Blvd, Sector ${i + 1}`,
        availableSlots: openSlots,
        totalSlots: tmpl.totalSlots,
        pricePerHour: tmpl.rate,
        openHours: "24 Hours Open",
        image: tmpl.img,
        facilities: tmpl.facilities,
        lat: spotLat,
        lng: spotLng,
        pinType: "green",
        vehicleTypes: ["Car", "Bike", "Truck", "Others"],
        isGenerated: true
      });
    }

    return generated;
  }

  // Generate an overflow duplicate parking lot if a specific lot is full
  async generateOverflowForFullLocation(locationId) {
    const locations = await this.getLocations();
    const target = locations.find(l => l.id === locationId);
    if (!target) return null;

    const offsetLat = target.lat + (Math.random() * 0.004 - 0.002);
    const offsetLng = target.lng + (Math.random() * 0.004 - 0.002);
    const userCoords = this.getUserLocation();
    const dist = this.calculateDistanceKm(userCoords.lat, userCoords.lng, offsetLat, offsetLng);

    const duplicateLot = {
      id: `loc-overflow-${Date.now()}`,
      name: `${target.name} (Overflow Bay B)`,
      distance: `${dist} km away`,
      distanceKm: dist,
      rating: target.rating,
      reviewsCount: 38,
      address: `${target.address} - Annex Area`,
      availableSlots: 20,
      totalSlots: 30,
      pricePerHour: target.pricePerHour,
      openHours: target.openHours,
      image: target.image,
      facilities: target.facilities,
      lat: offsetLat,
      lng: offsetLng,
      pinType: "green",
      vehicleTypes: target.vehicleTypes,
      isGenerated: true
    };

    locations.unshift(duplicateLot);
    localStorage.setItem(this.storageKeyLocations, JSON.stringify(locations));

    if (this.isFirebaseReady && this.firestore) {
      try {
        await this.firestore.collection("parking_locations").doc(duplicateLot.id).set(duplicateLot);
      } catch (e) {
        console.warn("Could not save overflow lot to Firestore:", e);
      }
    }

    this.notifyChange();
    return duplicateLot;
  }

  // Get all parking locations (with automatic distance calculation & duplicate generation if needed)
  async getLocations(userCoords = null) {
    const coords = userCoords || this.getUserLocation();
    let locations = [];

    if (this.isFirebaseReady && this.firestore) {
      try {
        const snap = await this.firestore.collection("parking_locations").get();
        if (!snap.empty) {
          snap.forEach(doc => locations.push({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {
        console.warn("Firestore fetch error, falling back to local:", e);
      }
    }

    if (locations.length === 0) {
      const data = localStorage.getItem(this.storageKeyLocations);
      locations = data ? JSON.parse(data) : [...SEED_LOCATIONS];
    }

    // Recalculate real distance from user's current coordinates
    if (coords && coords.lat && coords.lng) {
      locations.forEach(loc => {
        const d = this.calculateDistanceKm(coords.lat, coords.lng, loc.lat, loc.lng);
        loc.distanceKm = d;
        loc.distance = `${d} km away`;
      });
    }

    // Check if any spots are nearby (within 15km) and have vacant slots
    const nearbyAvailable = locations.filter(loc => loc.distanceKm <= 15 && loc.availableSlots > 0);

    // IF NO NEARBY PARKING AREAS ARE AVAILABLE, OR ALL ARE FULL:
    // Generate duplicate/new parking areas around the user's exact location!
    if (nearbyAvailable.length < 2) {
      console.log("📍 No nearby parking areas available around user. Auto-generating duplicate areas...");
      this.wasDuplicateGenerated = true;
      const duplicates = this.generateNearbyDuplicateParking(coords.lat, coords.lng, coords.areaName || "Nearby", 4);
      
      // Merge with existing locations
      locations = [...duplicates, ...locations];
      localStorage.setItem(this.storageKeyLocations, JSON.stringify(locations));

      if (this.isFirebaseReady && this.firestore) {
        try {
          const batch = this.firestore.batch();
          duplicates.forEach(d => {
            const ref = this.firestore.collection("parking_locations").doc(d.id);
            batch.set(ref, d);
          });
          await batch.commit();
        } catch (err) {
          console.warn("Firestore batch duplicate save warning:", err);
        }
      }
    }

    // Sort locations by closest distance first
    locations.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));

    return locations;
  }

  // Explicitly add duplicate parking spots around user coordinates
  async addDuplicateParkingSpots(userLat, userLng, areaName = "Nearby Area", count = 4) {
    this.wasDuplicateGenerated = true;
    const duplicates = this.generateNearbyDuplicateParking(userLat, userLng, areaName, count);
    const existing = await this.getLocations();
    const combined = [...duplicates, ...existing];

    // Sort by proximity
    combined.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
    localStorage.setItem(this.storageKeyLocations, JSON.stringify(combined));

    if (this.isFirebaseReady && this.firestore) {
      try {
        const batch = this.firestore.batch();
        duplicates.forEach(d => {
          const ref = this.firestore.collection("parking_locations").doc(d.id);
          batch.set(ref, d);
        });
        await batch.commit();
      } catch (err) {
        console.warn("Firestore batch duplicate save warning:", err);
      }
    }

    this.notifyChange();
    return duplicates;
  }

  // Get single location by ID
  async getLocationById(id) {
    const locations = await this.getLocations();
    return locations.find(loc => loc.id === id) || locations[0];
  }

  // Update available slot count (decrement on booking, increment on cancel)
  async updateLocationSlots(locationId, delta) {
    const locations = await this.getLocations();
    const loc = locations.find(l => l.id === locationId);
    if (loc) {
      loc.availableSlots = Math.max(0, Math.min(loc.totalSlots, loc.availableSlots + delta));
      localStorage.setItem(this.storageKeyLocations, JSON.stringify(locations));
      
      if (this.isFirebaseReady && this.firestore) {
        try {
          await this.firestore.collection("parking_locations").doc(locationId).update({
            availableSlots: loc.availableSlots
          });
        } catch (e) {
          console.warn("Firestore update slots error:", e);
        }
      }
    }
    this.notifyChange();
    return loc;
  }

  // Add new parking location facility (Admin feature)
  async addLocation(locData) {
    const locations = await this.getLocations();
    const newLoc = {
      id: "loc-" + Date.now(),
      distance: "0.8 km away",
      distanceKm: 0.8,
      rating: 4.5,
      reviewsCount: 12,
      image: "assets/images/city_mall.jpg",
      facilities: ["CCTV", "Security", "All-Vehicle Bays"],
      pinType: "green",
      vehicleTypes: ["Car", "Bike", "Truck", "Others"],
      ...locData
    };
    locations.unshift(newLoc);
    localStorage.setItem(this.storageKeyLocations, JSON.stringify(locations));
    if (this.isFirebaseReady && this.firestore) {
      try {
        await this.firestore.collection("parking_locations").doc(newLoc.id).set(newLoc);
      } catch (e) {
        console.warn("Firestore addLocation error:", e);
      }
    }
    this.notifyChange();
    return newLoc;
  }

  // Get user bookings
  async getBookings() {
    if (this.isFirebaseReady && this.firestore) {
      try {
        const snap = await this.firestore.collection("bookings").orderBy("createdAt", "desc").get();
        if (!snap.empty) {
          const list = [];
          snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
          localStorage.setItem(this.storageKeyBookings, JSON.stringify(list));
          return list;
        }
      } catch (e) {
        console.warn("Firestore bookings fetch error, using local:", e);
      }
    }
    const data = localStorage.getItem(this.storageKeyBookings);
    return data ? JSON.parse(data) : SEED_BOOKINGS;
  }

  // Add new booking
  async createBooking(bookingData) {
    const newBooking = {
      id: "booking-" + Date.now(),
      bookingId: "#SPF" + Math.floor(100000 + Math.random() * 900000),
      createdAt: new Date().toISOString(),
      status: "Active",
      ...bookingData
    };

    const bookings = await this.getBookings();
    bookings.unshift(newBooking);
    localStorage.setItem(this.storageKeyBookings, JSON.stringify(bookings));

    // Decrement slot in location
    await this.updateLocationSlots(newBooking.locationId, -1);

    if (this.isFirebaseReady && this.firestore) {
      try {
        await this.firestore.collection("bookings").doc(newBooking.id).set(newBooking);
      } catch (e) {
        console.warn("Firestore createBooking error:", e);
      }
    }

    this.notifyChange();
    return newBooking;
  }

  // Cancel booking
  async cancelBooking(bookingId) {
    const bookings = await this.getBookings();
    const b = bookings.find(item => item.id === bookingId || item.bookingId === bookingId);
    if (b && b.status === "Active") {
      b.status = "Cancelled";
      localStorage.setItem(this.storageKeyBookings, JSON.stringify(bookings));

      // Restore slot count
      await this.updateLocationSlots(b.locationId, 1);

      if (this.isFirebaseReady && this.firestore) {
        try {
          await this.firestore.collection("bookings").doc(b.id).update({ status: "Cancelled" });
        } catch (e) {
          console.warn("Firestore cancelBooking error:", e);
        }
      }
      this.notifyChange();
      return b;
    }
    return null;
  }

  // Extend booking
  async extendBooking(bookingId, extraHours, extraAmount) {
    const bookings = await this.getBookings();
    const b = bookings.find(item => item.id === bookingId || item.bookingId === bookingId);
    if (b) {
      const currentHours = b.durationHours || parseInt(b.duration) || 1;
      const newHours = currentHours + extraHours;
      b.durationHours = newHours;
      b.duration = `${newHours} Hours`;
      b.amountPaid = (b.amountPaid || 0) + extraAmount;

      localStorage.setItem(this.storageKeyBookings, JSON.stringify(bookings));

      if (this.isFirebaseReady && this.firestore) {
        try {
          await this.firestore.collection("bookings").doc(b.id).update({
            duration: b.duration,
            durationHours: b.durationHours,
            amountPaid: b.amountPaid
          });
        } catch (e) {
          console.warn("Firestore extendBooking error:", e);
        }
      }
      this.notifyChange();
      return b;
    }
    return null;
  }

  // User Profile
  getUser() {
    const data = localStorage.getItem(this.storageKeyUser);
    return data ? JSON.parse(data) : SEED_USER;
  }

  saveUser(user) {
    localStorage.setItem(this.storageKeyUser, JSON.stringify(user));
    this.notifyChange();
  }

  // Subscribe to changes
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyChange() {
    this.listeners.forEach(cb => {
      try { cb(); } catch (e) { console.error(e); }
    });
  }

  // Reset to initial seed data
  resetAllData() {
    localStorage.setItem(this.storageKeyLocations, JSON.stringify(SEED_LOCATIONS));
    localStorage.setItem(this.storageKeyBookings, JSON.stringify(SEED_BOOKINGS));
    localStorage.setItem(this.storageKeyUser, JSON.stringify(SEED_USER));
    this.notifyChange();
  }
}

// Global instance
window.parkingDataService = new ParkingDataService();
