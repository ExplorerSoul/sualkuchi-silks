# Sualkuchi Heritage Silks 🌾🧵

A decentralized, map-enabled digital showroom and custom loom marketplace designed to connect the master weavers of **Sualkuchi (Kamrup, Assam)**—the historical *Manchester of the East*—directly with global silk enthusiasts.

This application is built with a serverless architecture using vanilla web technologies, Leaflet mapping APIs, and Firebase services (Authentication & Firestore). It empowers weavers to catalog their authentic **Muga, Paat, and Eri silk products**, locate their home looms on a hybrid satellite map, and accept bespoke custom loom orders from customers.

---

## 🌟 Key Features

### 🛍️ Buyer Experience
- **Interactive Handloom Showroom (`index.html`)**: Browse authentic handwoven collections (Mekhela Sador, Muga Jora, Gamosa, Jewellery, and more) with real-time text search, category-based filtering chips, and dynamic price sorting (low-to-high / high-to-low).
- **Weaver Directory Map (`sellers.html`)**: Search and discover registered weaver shops through an interactive Leaflet map interface, linking directly to individual weaver profiles.
- **Custom Loom Orders (`wishlist.html`)**: Submit bespoke weave specifications—including yarn counts, warp threads, length, borders, and traditional Assamese motifs—directly to selected weavers.
- **Order Tracking & Lifecycle**: Monitor custom orders through detailed loom statuses (e.g., *Pending*, *Yarn Sourced*, *Loom Setup*, *Active Weaving*, *Finished*, *Dispatched*).
- **Buyer Profiles (`profile.html`)**: Manage profile details, save shipping addresses, track active wishlists, and view order histories.

### 🧶 Weaver & Seller Portal
- **Secure Onboarding & Authentication (`admin.html`)**: Register and login securely using Google Sign-In or Mobile Phone Verification (SMS OTP authentication).
- **Interactive Satellite Locator**: Setup and modify shop coordinates using a custom Leaflet interface configured with high-resolution ESRI Hybrid Satellite imagery. Weavers can drop a pin exactly on their home/workshop location.
- **Inventory CRUD Dashboard**: Add, edit, preview, and delete shop products. Includes automatic client-side image compression (max 800KB) and conversion to Base64 data strings for efficient storage.
- **Bespoke Order Management**: View incoming buyer orders, review structural and design specifications, accept/decline orders, and update loom status stages in real-time.
- **Direct WhatsApp Messaging**: Open one-click chat rooms with buyers directly using the pre-configured WhatsApp phone API.

---

## 🛠️ Technology Stack

1. **Frontend Core**: HTML5 & ES6 Javascript (Modular Imports / ESM).
2. **Styling & Theme**: Vanilla CSS3 with a premium, responsive color palette:
   - Deep Maroon (`#800000` / `#600000`) for cultural heritage aesthetics.
   - Assamese Golden Silk (`#C5A059` / `#fcf6e9`) as the primary accent color.
   - Clean, modern layout grids, fluid micro-interactions, and custom transitions.
3. **Typography**: Google Fonts integration (`Playfair Display` for headings, `Lato` and `Inter` for body copy).
4. **Database & Auth**: Serverless Firebase v10.7 (Firestore database + Firebase Client SDK Auth).
5. **Interactive Mapping**: Leaflet JS v1.9 maps styled with ESRI Satellite imagery and World Transportation overlays.

---

## 🚀 Local Setup & Installation

### Prerequisite: Static File Server
Because this application uses Javascript ES Modules (`import`/`export`), opening files directly from the filesystem (`file://`) will result in CORS blocks by the browser. You must run a local web server.

### Steps to Run:
1. **Clone the repository**:
   ```bash
   git clone https://github.com/explorersoul/Sualkuchi.git
   cd Sualkuchi
   ```

2. **Run a local server**:
   - **Using Python (Recommended)**:
     ```bash
     python -m http.server 8000
     ```
   - **Using Node.js (`serve` or `http-server`)**:
     ```bash
     npx serve .
     ```

3. **Open in browser**:
   Navigate to [http://localhost:8000](http://localhost:8000) or the port outputted by your local server.

---

## 🔒 Security & Firebase Configuration

Database configuration resides in [modules/core/db.js](file:///c:/Users/DELL/Documents/GitHub/Sualkuchi/modules/core/db.js). In a production environment:

1. **Firebase Authentication**: Enable both **Google Provider** and **Phone Provider** inside the Firebase console. Configure reCAPTCHA verification domains.
2. **Firestore Security Rules**: Ensure appropriate collections are protected. Weavers should only edit products and profile coordinates where `request.auth.uid == resource.data.sellerId`. Example rule structure:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /products/{product} {
         allow read: if true;
         allow write: if request.auth != null && request.auth.uid == request.resource.data.sellerId;
       }
       match /sellers/{seller} {
         allow read: if true;
         allow write: if request.auth != null && request.auth.uid == seller;
       }
       match /orders/{order} {
         allow read: if request.auth != null && (request.auth.uid == resource.data.customerId || request.auth.uid == resource.data.sellerId);
         allow write: if request.auth != null;
       }
     }
   }
   ```

---

## 🤝 Contributing
Contributions to preserve the handloom heritage are welcome! Feel free to open issues or submit pull requests to enhance map responsiveness, add payment gateways, or translate UI components.

---

## 📜 License
Developed in Kamrup, Assam. Distributed under the MIT License. See `LICENSE` for more information (if available).
