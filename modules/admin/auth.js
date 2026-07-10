// Admin Authentication & Onboarding/Edit Profile Controller
import { 
    auth, 
    db, 
    doc, 
    getDoc, 
    onAuthStateChanged, 
    signOut, 
    RecaptchaVerifier, 
    signInWithPhoneNumber,
    GoogleAuthProvider,
    signInWithPopup
} from '../core/db.js';
import { loadInventory, saveSellerProfile } from './dashboard.js';

// Global Map instances
let onboardingMap = null;
let onboardingMarker = null;
let editMap = null;
let editMarker = null;

/**
 * Initializes a Leaflet Map with ESRI Satellite Imagery & Roads Hybrid Layer
 * @param {string} containerId - Element ID for map container
 * @param {string} latInputId - Element ID for latitude hidden input
 * @param {string} lngInputId - Element ID for longitude hidden input
 * @param {number} defaultLat - Default Latitude coordinate
 * @param {number} defaultLng - Default Longitude coordinate
 * @returns {Object} Map and Marker references
 */
function initSatelliteMap(containerId, latInputId, lngInputId, defaultLat, defaultLng) {
    const latInput = document.getElementById(latInputId);
    const lngInput = document.getElementById(lngInputId);

    const lat = Number(latInput.value) || defaultLat;
    const lng = Number(lngInput.value) || defaultLng;

    console.log(`[Satellite Map] Initializing satellite map hybrid inside "${containerId}" centered at ${lat}, ${lng}`);

    try {
        const map = L.map(containerId).setView([lat, lng], 16);

        // ESRI Satellite Imagery Layer
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }).addTo(map);

        // ESRI World Transportation Overlay
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
        }).addTo(map);

        let marker = null;
        if (latInput.value && lngInput.value) {
            console.log(`[Satellite Map] Pre-existing coordinates found. Placed marker at ${lat}, ${lng}`);
            marker = L.marker([lat, lng], { draggable: true }).addTo(map);
            
            marker.on('dragend', () => {
                const position = marker.getLatLng();
                console.log(`[Satellite Map] Marker dragged to: ${position.lat}, ${position.lng}`);
                latInput.value = position.lat;
                lngInput.value = position.lng;
            });
        }

        // Map Click Listener to drop marker pin
        map.on('click', (e) => {
            const clickLat = e.latlng.lat;
            const clickLng = e.latlng.lng;
            console.log(`[Satellite Map] Map clicked at coordinate: ${clickLat}, ${clickLng}`);

            if (marker) {
                marker.setLatLng(e.latlng);
            } else {
                console.log("[Satellite Map] Creating new draggable marker pin...");
                marker = L.marker(e.latlng, { draggable: true }).addTo(map);
                
                marker.on('dragend', () => {
                    const position = marker.getLatLng();
                    console.log(`[Satellite Map] Marker dragged to: ${position.lat}, ${position.lng}`);
                    latInput.value = position.lat;
                    lngInput.value = position.lng;
                });
            }

            latInput.value = clickLat;
            lngInput.value = clickLng;
        });

        // Resolve rendering glitches
        setTimeout(() => {
            map.invalidateSize();
        }, 300);

        return { map, marker };

    } catch (e) {
        console.error("[Satellite Map] Satellite map initialization failed:", e);
        return { map: null, marker: null };
    }
}

/**
 * Loads current seller profile details from Firestore and fills profile editor form
 */
async function loadProfileEditorValues() {
    const user = auth.currentUser;
    if (!user) {
        console.warn("[Profile Editor] Aborted: No active user session.");
        return;
    }

    try {
        console.log(`[Profile Editor] Querying seller document details for UID: ${user.uid}`);
        const sellerDocRef = doc(db, "sellers", user.uid);
        const sellerDocSnap = await getDoc(sellerDocRef);

        if (sellerDocSnap.exists()) {
            const data = sellerDocSnap.data();
            console.log("[Profile Editor] Seller document found. Populating editor values...");

            document.getElementById('edit-shop-name').value = data.shopName || "";
            document.getElementById('edit-profile-phone').value = data.phone || "";
            document.getElementById('edit-profile-address').value = data.address || "";
            document.getElementById('edit-profile-lat').value = data.latitude || "";
            document.getElementById('edit-profile-lng').value = data.longitude || "";

            // Pre-fill and lock phone if Phone Auth user
            const editPhoneInput = document.getElementById('edit-profile-phone');
            if (editPhoneInput) {
                if (user.phoneNumber) {
                    console.log("[Profile Editor] Active session verified via Phone OTP. Disabling edit option for phone input.");
                    editPhoneInput.value = user.phoneNumber;
                    editPhoneInput.disabled = true;
                } else {
                    editPhoneInput.disabled = false;
                }
            }

            // Initialize or center satellite map in editor
            const savedLat = data.latitude || 26.167499;
            const savedLng = data.longitude || 91.573768;

            if (!editMap) {
                console.log("[Profile Editor] Initializing satellite map picker inside settings editor...");
                const result = initSatelliteMap(
                    'edit-map-picker-container',
                    'edit-profile-lat',
                    'edit-profile-lng',
                    savedLat,
                    savedLng
                );
                editMap = result.map;
                editMarker = result.marker;
            } else {
                console.log(`[Profile Editor] Center coordinates updated: ${savedLat}, ${savedLng}`);
                if (editMarker) {
                    editMarker.setLatLng([savedLat, savedLng]);
                } else {
                    editMarker = L.marker([savedLat, savedLng], { draggable: true }).addTo(editMap);
                    editMarker.on('dragend', () => {
                        const position = editMarker.getLatLng();
                        document.getElementById('edit-profile-lat').value = position.lat;
                        document.getElementById('edit-profile-lng').value = position.lng;
                    });
                }
                editMap.setView([savedLat, savedLng], 16);
                setTimeout(() => {
                    editMap.invalidateSize();
                }, 300);
            }
        } else {
            console.warn(`[Profile Editor] Seller profile does not exist for UID ${user.uid}`);
        }
    } catch (error) {
        console.error("[Profile Editor] Failed to fetch profile details:", error);
    }
}

/**
 * Bootstraps Authentication event listeners and DOM controls
 */
export function initAuth() {
    const loginSection = document.getElementById('login-section');
    const profileSection = document.getElementById('profile-setup-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const inventoryView = document.getElementById('inventory-view-container');
    const profileEditView = document.getElementById('profile-edit-view-container');
    
    const sendOtpBtn = document.getElementById('send-otp-btn');
    const verifyOtpBtn = document.getElementById('verify-otp-btn');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Setup controls
    const saveProfileBtn = document.getElementById('save-profile-btn');
    
    // Editor controls
    const avatarBtn = document.getElementById('admin-avatar-container');
    const closeProfileBtn = document.getElementById('close-profile-btn');
    const updateProfileBtn = document.getElementById('update-profile-btn');

    if (!loginSection || !dashboardSection || !profileSection) return;

    // 1. Auth state listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log(`[Auth Listener] Active session authenticated. User UID: "${user.uid}"`);
            try {
                // Populate user avatar in dashboard header
                const avatarImg = document.getElementById('admin-avatar');
                const avatarFallback = document.getElementById('admin-avatar-fallback');
                
                if (user.photoURL && avatarImg && avatarFallback) {
                    avatarImg.src = user.photoURL;
                    avatarImg.style.display = 'block';
                    avatarFallback.style.display = 'none';
                } else if (avatarImg && avatarFallback) {
                    avatarImg.style.display = 'none';
                    avatarFallback.style.display = 'flex';
                    const identifier = user.email || user.phoneNumber || "U";
                    avatarFallback.innerText = identifier.replace(/[^a-zA-Z0-9]/g, '').charAt(0).toUpperCase();
                }

                // Check if seller profile exists
                const sellerDocRef = doc(db, "sellers", user.uid);
                const sellerDocSnap = await getDoc(sellerDocRef);

                if (sellerDocSnap.exists()) {
                    console.log("[Auth Listener] Weaver profile verified in database. Showing inventory dashboard.");
                    loginSection.style.display = 'none';
                    profileSection.style.display = 'none';
                    dashboardSection.style.display = 'block';
                    
                    if (inventoryView) inventoryView.style.display = 'flex';
                    if (profileEditView) profileEditView.style.display = 'none';

                    loadInventory(); // Load inventory table
                } else {
                    console.log("[Auth Listener] Seller profile does not exist. Redirecting to onboarding...");
                    loginSection.style.display = 'none';
                    dashboardSection.style.display = 'none';
                    profileSection.style.display = 'block';
                    
                    const profilePhoneInput = document.getElementById('profile-phone');
                    if (profilePhoneInput) {
                        if (user.phoneNumber) {
                            profilePhoneInput.value = user.phoneNumber;
                            profilePhoneInput.disabled = true;
                        } else {
                            profilePhoneInput.value = "";
                            profilePhoneInput.disabled = false;
                        }
                    }

                    // Initialize satellite map picker
                    const res = initSatelliteMap(
                        'map-picker-container',
                        'profile-lat',
                        'profile-lng',
                        26.167499,
                        91.573768
                    );
                    onboardingMap = res.map;
                    onboardingMarker = res.marker;
                }
            } catch (error) {
                console.error("[Auth Listener] Failed to handle active session checks:", error);
                alert("Error checking profile: " + error.message);
            }
        } else {
            console.log("[Auth Listener] No active session found. Revealing Login panel.");
            loginSection.style.display = 'block';
            profileSection.style.display = 'none';
            dashboardSection.style.display = 'none';
            
            const otpBlock = document.getElementById('otp-block');
            if (otpBlock) otpBlock.style.display = 'none';
            if (sendOtpBtn) sendOtpBtn.disabled = false;

            // Clear maps
            onboardingMap = null;
            onboardingMarker = null;
            editMap = null;
            editMarker = null;
        }
    });

    // 2. OTP Sender Click handler
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', () => {
            const rawPhone = document.getElementById('phone-number').value.trim();
            if (!rawPhone) {
                alert("Please enter your phone number.");
                return;
            }

            let phoneNumber = rawPhone;
            if (!phoneNumber.startsWith('+')) {
                phoneNumber = '+91' + phoneNumber.replace(/^0+/, '');
            }

            try {
                if (!window.recaptchaVerifier) {
                    console.log("[Auth Phone] Setting up invisible Recaptcha verifier...");
                    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                        'size': 'invisible'
                    });
                }

                sendOtpBtn.disabled = true;
                sendOtpBtn.innerText = "Sending code...";
                console.log(`[Auth Phone] Dispatching SMS OTP code request to: ${phoneNumber}`);

                signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
                    .then((confirmationResult) => {
                        window.confirmationResult = confirmationResult;
                        document.getElementById('otp-block').style.display = 'block';
                        sendOtpBtn.innerText = "Code Sent";
                        console.log("[Auth Phone] SMS OTP code dispatched successfully.");
                        alert("Verification code sent to " + phoneNumber);
                    })
                    .catch((err) => {
                        console.error("[Auth Phone] Failed to send SMS OTP:", err);
                        alert("Failed to send SMS: " + err.message);
                        sendOtpBtn.disabled = false;
                        sendOtpBtn.innerText = "Send Verification Code";
                        if (window.recaptchaVerifier) {
                            window.recaptchaVerifier.clear();
                            window.recaptchaVerifier = null;
                        }
                    });

            } catch (e) {
                console.error("[Auth Phone] Capture verifier creation failed:", e);
                alert("Error setting up captcha: " + e.message);
                sendOtpBtn.disabled = false;
                sendOtpBtn.innerText = "Send Verification Code";
            }
        });
    }

    // 3. OTP verification validation
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', () => {
            const code = document.getElementById('verification-code').value.trim();
            if (!code || code.length !== 6) {
                alert("Please enter a valid 6-digit code.");
                return;
            }

            if (!window.confirmationResult) {
                alert("Verification session expired. Please resend SMS.");
                return;
            }

            verifyOtpBtn.disabled = true;
            verifyOtpBtn.innerText = "Verifying...";
            console.log(`[Auth Phone] Verifying verification code: ${code}`);

            window.confirmationResult.confirm(code)
                .then((result) => {
                    console.log("[Auth Phone] OTP verification succeeded. User: ", result.user.uid);
                })
                .catch((error) => {
                    console.error("[Auth Phone] OTP verification failed:", error);
                    alert("Invalid code: " + error.message);
                    verifyOtpBtn.disabled = false;
                    verifyOtpBtn.innerText = "Verify & Login";
                });
        });
    }

    // 4. Google Login button listener
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            console.log("[Auth Google] Spawning Google login popup...");
            const provider = new GoogleAuthProvider();
            signInWithPopup(auth, provider)
                .then((result) => {
                    console.log("[Auth Google] Google login successful. User: ", result.user.uid);
                })
                .catch((error) => {
                    console.error("[Auth Google] Google popup login failed:", error);
                    alert("Google Login failed: " + error.message);
                });
        });
    }

    // 5. Logout trigger
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            console.log("[Auth] Logout triggered. Cleaning active session.");
            signOut(auth).then(() => {
                onboardingMap = null;
                onboardingMarker = null;
                editMap = null;
                editMarker = null;
                console.log("[Auth] Logout completed successfully.");
            }).catch(e => {
                console.error("[Auth] Logout failed:", e);
                alert("Logout failed: " + e.message);
            });
        });
    }

    // 6. Onboarding profile submission
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const shopName = document.getElementById('profile-shop-name').value.trim();
            const phone = document.getElementById('profile-phone').value.trim();
            const address = document.getElementById('profile-address').value.trim();
            const lat = document.getElementById('profile-lat').value;
            const lng = document.getElementById('profile-lng').value;

            console.log("[Profile Onboarding] Save profile button clicked. Validating inputs...");

            if (!phone) {
                alert("Please enter your WhatsApp contact number.");
                return;
            }

            if (!address) {
                alert("Please enter your street address.");
                return;
            }

            if (!lat || !lng) {
                alert("Please select your location on the map.");
                return;
            }

            saveProfileBtn.disabled = true;
            saveProfileBtn.innerText = "Saving Profile...";

            const success = await saveSellerProfile({
                shopName: shopName,
                phone: phone,
                address: address,
                latitude: Number(lat),
                longitude: Number(lng)
            });

            if (success) {
                console.log("[Profile Onboarding] Profile setup succeeded. Launching dashboard views.");
                alert("Profile created successfully!");
                profileSection.style.display = 'none';
                dashboardSection.style.display = 'block';
                if (inventoryView) inventoryView.style.display = 'flex';
                if (profileEditView) profileEditView.style.display = 'none';
                loadInventory();
            } else {
                saveProfileBtn.disabled = false;
                saveProfileBtn.innerText = "Create Profile & Continue";
            }
        });
    }

    // 7. Toggle Edit Profile Panel on Avatar Click
    if (avatarBtn) {
        avatarBtn.addEventListener('click', () => {
            if (inventoryView && profileEditView) {
                if (inventoryView.style.display !== 'none') {
                    console.log("[Dashboard Navigation] Transitioning to Edit Profile tab...");
                    inventoryView.style.display = 'none';
                    profileEditView.style.display = 'block';
                    loadProfileEditorValues();
                } else {
                    console.log("[Dashboard Navigation] Transitioning back to Inventory Dashboard...");
                    profileEditView.style.display = 'none';
                    inventoryView.style.display = 'flex';
                }
            }
        });
    }

    // 8. Close Profile Editor panel
    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => {
            console.log("[Dashboard Navigation] Profile Editor close triggered. Showing inventory.");
            if (inventoryView && profileEditView) {
                profileEditView.style.display = 'none';
                inventoryView.style.display = 'flex';
            }
        });
    }

    // 9. Update Profile Details Submission
    if (updateProfileBtn) {
        updateProfileBtn.addEventListener('click', async () => {
            const shopName = document.getElementById('edit-shop-name').value.trim();
            const phone = document.getElementById('edit-profile-phone').value.trim();
            const address = document.getElementById('edit-profile-address').value.trim();
            const lat = document.getElementById('edit-profile-lat').value;
            const lng = document.getElementById('edit-profile-lng').value;
            const statusMsg = document.getElementById('profile-status-msg');

            console.log("[Profile Editor] Save edits clicked. Validating inputs...");

            if (!phone) {
                alert("Please enter your WhatsApp contact number.");
                return;
            }

            if (!address) {
                alert("Please enter your street address.");
                return;
            }

            if (!lat || !lng) {
                alert("Please select your location marker on the satellite map.");
                return;
            }

            updateProfileBtn.disabled = true;
            if (statusMsg) statusMsg.innerText = "Updating profile details...";

            const success = await saveSellerProfile({
                shopName: shopName,
                phone: phone,
                address: address,
                latitude: Number(lat),
                longitude: Number(lng)
            });

            if (success) {
                console.log("[Profile Editor] Profile document updated. Transitioning back to inventory.");
                alert("Profile details updated successfully!");
                if (statusMsg) statusMsg.innerText = "";
                if (inventoryView && profileEditView) {
                    profileEditView.style.display = 'none';
                    inventoryView.style.display = 'flex';
                }
                loadInventory();
            } else {
                updateProfileBtn.disabled = false;
                if (statusMsg) statusMsg.innerText = "Failed to update profile details.";
            }
        });
    }
}

// Auto run on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}
