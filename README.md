# 🚗 Smart Parking Slot Finder (Responsive Web Application)

A modern, high-performance **Single Page Web Application (SPA)** built with **HTML5, CSS3, and JavaScript**, backed by **Google Firebase Firestore** for real-time cloud data storage and live slot reservations.

---

## 🧭 Step-by-Step User Journey (All 10 Pages in 1 Web App)

Instead of individual disconnected pages or mock test frames, all 10 views are built into **one unified web application** that transitions smoothly **step-by-step**:

```
[1. Landing / Welcome]  ──(Click "Get Started")──▶  [2. Login Page]
                                                          │
               ┌──────────────────────────────────────────┴───────────────┐
               ▼                                                          ▼
       [3. Sign Up Page]                                       (Click "Login" or Google)
               │                                                          │
               └───────────────────────┬──────────────────────────────────┘
                                       ▼
                             [4. Home Dashboard]
                                       │
                      ┌────────────────┴───────────────┐
                      ▼                                ▼
            [5. Find Parking / Map]           [Popular Spot Card]
                      │                                │
                      └────────────────┬───────────────┘
                                       ▼
                            [6. Parking Details]
                                       │
                              (Click "Book Slot")
                                       ▼
                          [7. Book Parking Slot]
                                       │
                          (Click "Confirm Booking")
                                       ▼
                          [8. Booking Confirmed]
                                       │
                             (Click "View Booking")
                                       ▼
                            [9. My Bookings Page]
                                       │
                              (Click "Profile")
                                       ▼
                            [10. User Profile Page]
```

---

### 📄 Detailed Breakdown of the 10 Pages:

1. **Page 1: Landing & Welcome Page (`#page-splash`)**
   - **What you see initially**: Hero badge, bold headline *"Smart Parking Slot Finder"*, tagline *"Find • Book • Park • Move Smart"*, feature highlights, and hero illustration.
   - **Step trigger**: Clicking **"Get Started"** smoothly transitions to **Page 2: Login**!

2. **Page 2: Login Page (`#page-login`)**
   - **Form fields**: Email / Phone Number, Password with show/hide toggle eye icon, and *"Forgot Password?"*.
   - **Actions**:
     - Submitting **"Login"** or clicking **"Continue with Google"** logs in and opens **Page 4: Home Dashboard**!
     - Clicking **"Sign Up"** transitions to **Page 3: Sign Up**!

3. **Page 3: Create Account (`#page-signup`)**
   - **Form fields**: Full Name, Phone Number, Email, Password, and Confirm Password.
   - **Actions**: Submitting **"Sign Up"** saves the new user profile and navigates directly to the **Home Dashboard**!

4. **Page 4: Home Dashboard (`#page-home`)**
   - **Header & Search**: Search bar with voice search mic button.
   - **Vehicle filters**: Interactive category pills (**Car**, **Bike**, **Truck**, **Others**) that immediately filter available spots.
   - **Promo Card**: *"Park Smart • Save Time & Fuel"*.
   - **Popular Locations Grid**: Live cards for City Mall Parking, Metro Station Parking, IT Tech Park, and Central Market showing available slots, distance, and hourly pricing.
   - **Step trigger**: Clicking any location or *"Open Live Map"* opens **Page 5: Map** or **Page 6: Details**!

5. **Page 5: Find Parking / Interactive Map (`#page-map`)**
   - **Split desktop layout**: Left sidebar list of parking spots + Right interactive Leaflet map canvas.
   - **Pins**: Custom green "P" pins (available slots) and red "P" pins (busy/limited slots), plus blue pulsating user GPS dot.
   - **Step trigger**: Tapping any pin shows the floating location card with **"View & Book"**, leading to **Page 6: Parking Details**!

6. **Page 6: Parking Details (`#page-details`)**
   - **Overview**: Hero image, rating, full address, live available slots (e.g., 25 / 50), hourly pricing (₹20/hr), and operating hours.
   - **Facilities**: CCTV 24x7, Guarded Security, EV Charging, Restroom / Washroom.
   - **Step trigger**: Clicking **"Book Slot Now"** leads to **Page 7: Book Parking Slot**!

7. **Page 7: Book Parking Slot (`#page-book`)**
   - **Checkout form**: Vehicle type, registration plate number, contact phone, booking date, and duration selector (1 to 8 Hours).
   - **Dynamic calculation**: Automatically updates the total payable amount (`₹20/hr × Duration = Total`).
   - **Step trigger**: Clicking **"Confirm & Reserve Slot"** decrements the slot count in the database and opens **Page 8: Booking Confirmed**!

8. **Page 8: Booking Confirmed (`#page-confirmed`)**
   - **Confirmation pass**: Green animated checkmark badge with parking pass ticket receipt (Booking ID `#SPF123456`, location, vehicle number, date & time, amount).
   - **Step trigger**: Clicking **"View My Bookings"** transitions to **Page 9: My Bookings**!

9. **Page 9: My Bookings (`#page-bookings`)**
   - **Tabs**: Segmented control between *"Upcoming Reservations"* and *"Booking History"*.
   - **Active reservations**: Displays active tickets with **"Extend Duration"** (adds extra hours) and **"Cancel Booking"** (cancels reservation and restores vacant slot in the database in real-time).

10. **Page 10: Profile & Settings (`#page-profile`)**
    - **User Profile**: Aarav Mehta, phone, email, and avatar.
    - **Menu options**: My Registered Vehicles, Payment Methods, Notifications, Help & Support, Database Settings (Firebase).
    - **Step trigger**: Clicking **"Logout"** resets the session and returns to **Page 1: Landing Page**!

---

## 🛠️ Technology Stack
- **HTML5:** Semantic structure, accessible inputs, SVG icons.
- **Vanilla CSS3:** Responsive grid/flexbox layout, glassmorphism navbar, card elevation, Plus Jakarta Sans typography.
- **JavaScript (ES6+):** SPA client-side router, Leaflet map engine, dynamic pricing, and form validation.
- **Database:** **Google Firebase Firestore** with offline-first localStorage fallback.
- **Optional Servers:** Zero-dependency **Node.js** (`server.js`) and **Java** (`SmartParkingServer.java`).

---

## 🚀 How to Run

### 1. In Any Browser Directly
Double-click [index.html](file:///c:/Users/pchar/Downloads/se-2/index.html) to open the app in Chrome, Edge, Firefox, or Safari.

### 2. With Node.js Server (Running on Port 3000)
```bash
node server.js
```
Open **[http://localhost:3000](http://localhost:3000)**.

### 3. With Java Server
```bash
javac SmartParkingServer.java
java SmartParkingServer
```
Open **[http://localhost:8080](http://localhost:8080)**.
