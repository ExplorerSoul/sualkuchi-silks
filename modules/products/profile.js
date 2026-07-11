// Customer Profile Controller
import { 
    auth, 
    db, 
    doc, 
    getDoc, 
    setDoc, 
    onAuthStateChanged, 
    signOut, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
} from '../core/db.js';

document.addEventListener('DOMContentLoaded', () => {
    // Views
    const loggedOutView = document.getElementById('profile-logged-out-view');
    const loggedInView = document.getElementById('profile-logged-in-view');
    const loginPanel = document.getElementById('login-form-panel');
    const registerPanel = document.getElementById('register-form-panel');

    // Toggles
    const goToRegister = document.getElementById('go-to-register');
    const goToLogin = document.getElementById('go-to-login');

    // Input fields login
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginSubmitBtn = document.getElementById('login-submit-btn');

    // Input fields register
    const regNameInput = document.getElementById('reg-name');
    const regEmailInput = document.getElementById('reg-email');
    const regPhoneInput = document.getElementById('reg-phone');
    const regPasswordInput = document.getElementById('reg-password');
    const registerSubmitBtn = document.getElementById('register-submit-btn');

    // Logged in displays
    const profileName = document.getElementById('cust-profile-name');
    const profileEmail = document.getElementById('cust-profile-email');
    const profilePhone = document.getElementById('cust-profile-phone');
    const profileLogoutBtn = document.getElementById('profile-logout-btn');

    if (!loggedOutView) return;

    // 1. Panel Toggles
    if (goToRegister) {
        goToRegister.addEventListener('click', () => {
            loginPanel.style.display = 'none';
            registerPanel.style.display = 'block';
        });
    }

    if (goToLogin) {
        goToLogin.addEventListener('click', () => {
            registerPanel.style.display = 'none';
            loginPanel.style.display = 'block';
        });
    }

    // 2. Auth State Listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log(`[Customer Profile] Logged in user detected UID: ${user.uid}`);
            
            try {
                // Fetch profile details from 'customers'
                const customerDocRef = doc(db, "customers", user.uid);
                const customerDocSnap = await getDoc(customerDocRef);
                
                if (customerDocSnap.exists()) {
                    const customer = customerDocSnap.data();
                    console.log(`[Customer Profile] Profile fetched successfully: ${customer.name}`);
                    
                    profileName.innerText = customer.name || user.displayName || "Valued Client";
                    profileEmail.innerText = user.email;
                    profilePhone.innerText = customer.phone || "Not Provided";
                    
                    // Sync customer phone to local storage for quick access in wishlist/orders lookup
                    if (customer.phone) {
                        localStorage.setItem('clientPhone', customer.phone);
                    }

                    loggedOutView.style.display = 'none';
                    loggedInView.style.display = 'block';
                } else {
                    // Check if it's a seller logging into customer space
                    const sellerDocRef = doc(db, "sellers", user.uid);
                    const sellerDocSnap = await getDoc(sellerDocRef);
                    if (sellerDocSnap.exists()) {
                        console.log("[Customer Profile] Seller detected inside Customer Portal.");
                        alert("You are registered as a Weaver. Redirecting you to the Weaver Portal dashboard...");
                        window.location.href = "admin.html";
                        return;
                    }
                    
                    console.log("[Customer Profile] Account exists in Auth but has no document in 'customers'. Triggering phone completion...");
                    
                    // Hide other form panels and show complete profile inputs inside the logged-out container card
                    loginPanel.style.display = 'none';
                    registerPanel.style.display = 'none';
                    
                    const completeProfilePanel = document.getElementById('complete-profile-panel');
                    if (completeProfilePanel) {
                        completeProfilePanel.style.display = 'block';
                    }
                    
                    loggedOutView.style.display = 'block';
                    loggedInView.style.display = 'none';
                }
            } catch (err) {
                console.error("[Customer Profile] Failed to fetch customer data:", err);
            }
        } else {
            console.log("[Customer Profile] No active user session. Showing login.");
            loggedOutView.style.display = 'block';
            loggedInView.style.display = 'none';
            loginPanel.style.display = 'block';
            registerPanel.style.display = 'none';
            const completeProfilePanel = document.getElementById('complete-profile-panel');
            if (completeProfilePanel) {
                completeProfilePanel.style.display = 'none';
            }
        }
    });

    // 3. Register submit click handler
    if (registerSubmitBtn) {
        registerSubmitBtn.addEventListener('click', async () => {
            const name = regNameInput.value.trim();
            const email = regEmailInput.value.trim();
            const phone = regPhoneInput.value.trim();
            const password = regPasswordInput.value.trim();

            if (!name || !email || !phone || !password) {
                alert("Please fill in all details (Name, Email, WhatsApp, and Password).");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters long.");
                return;
            }

            registerSubmitBtn.disabled = true;
            registerSubmitBtn.innerText = "Creating Account...";
            console.log(`[Customer Profile] Creating Auth record for email: ${email}`);

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                console.log(`[Customer Profile] Auth created. Updating name to "${name}"...`);
                
                await updateProfile(user, { displayName: name });

                console.log("[Customer Profile] Saving profile data to Firestore...");
                await setDoc(doc(db, "customers", user.uid), {
                    name: name,
                    email: email,
                    phone: phone,
                    timestamp: new Date()
                });

                // Sync phone number
                localStorage.setItem('clientPhone', phone);
                
                alert("Account created successfully! Welcome to Sualkuchi Heritage Silks.");
                
                // Clear fields
                regNameInput.value = "";
                regEmailInput.value = "";
                regPhoneInput.value = "";
                regPasswordInput.value = "";
                registerSubmitBtn.disabled = false;
                registerSubmitBtn.innerText = "Register & Create Account";

            } catch (error) {
                console.error("[Customer Profile] Registration failed:", error);
                alert("Registration failed: " + error.message);
                registerSubmitBtn.disabled = false;
                registerSubmitBtn.innerText = "Register & Create Account";
            }
        });
    }

    // 4. Login submit click handler
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', async () => {
            const email = loginEmailInput.value.trim();
            const password = loginPasswordInput.value.trim();

            if (!email || !password) {
                alert("Please fill in your Email and Password.");
                return;
            }

            loginSubmitBtn.disabled = true;
            loginSubmitBtn.innerText = "Authenticating...";
            console.log(`[Customer Profile] Attempting sign-in for email: ${email}`);

            try {
                await signInWithEmailAndPassword(auth, email, password);
                console.log("[Customer Profile] Sign-in succeeded.");
                
                // Clear fields
                loginEmailInput.value = "";
                loginPasswordInput.value = "";
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.innerText = "Sign In";

            } catch (error) {
                console.error("[Customer Profile] Sign-in failed:", error);
                alert("Login failed: " + error.message);
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.innerText = "Sign In";
            }
        });
    }

    // 5. Logout handler
    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener('click', () => {
            console.log("[Customer Profile] Signing out user...");
            signOut(auth).then(() => {
                localStorage.removeItem('clientPhone');
                console.log("[Customer Profile] Logout complete.");
            }).catch(e => {
                console.error("[Customer Profile] Logout failed:", e);
            });
        });
    }

    // 6. Google Sign-in handler
    const googleSigninBtn = document.getElementById('google-signin-btn');
    if (googleSigninBtn) {
        googleSigninBtn.addEventListener('click', async () => {
            googleSigninBtn.disabled = true;
            googleSigninBtn.innerText = "Connecting Google...";
            
            try {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
                console.log("[Customer Profile] Google popup authentication completed.");
                googleSigninBtn.disabled = false;
                googleSigninBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.6z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.91-2.26a5.58 5.58 0 0 1-8.51-2.94H.51v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.54 10.6A5.4 5.4 0 0 1 3.3 9c0-.56.1-1.1.24-1.6V5.07H.51A9 9 0 0 0 0 9c0 1.43.34 2.8.93 4.02l2.61-2.02z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .51 5.07l3.03 2.35a5.58 5.58 0 0 1 5.46-3.84z"/></svg>
                    Sign In with Google
                `;
            } catch (error) {
                console.error("[Customer Profile] Google authentication failed:", error);
                alert("Google Sign-In failed: " + error.message);
                googleSigninBtn.disabled = false;
                googleSigninBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.6z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.91-2.26a5.58 5.58 0 0 1-8.51-2.94H.51v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.54 10.6A5.4 5.4 0 0 1 3.3 9c0-.56.1-1.1.24-1.6V5.07H.51A9 9 0 0 0 0 9c0 1.43.34 2.8.93 4.02l2.61-2.02z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .51 5.07l3.03 2.35a5.58 5.58 0 0 1 5.46-3.84z"/></svg>
                    Sign In with Google
                `;
            }
        });
    }

    // 7. Profile completion phone submission handler
    const completeSubmitBtn = document.getElementById('complete-submit-btn');
    const completePhoneInput = document.getElementById('complete-phone');
    if (completeSubmitBtn) {
        completeSubmitBtn.addEventListener('click', async () => {
            const phone = completePhoneInput.value.trim();
            const user = auth.currentUser;
            
            if (!user) {
                alert("Session expired. Please sign in again.");
                window.location.reload();
                return;
            }

            if (!phone) {
                alert("Please enter your WhatsApp contact number.");
                return;
            }

            completeSubmitBtn.disabled = true;
            completeSubmitBtn.innerText = "Completing Profile...";
            
            try {
                console.log("[Customer Profile] Saving Google user profile data with phone number...");
                await setDoc(doc(db, "customers", user.uid), {
                    name: user.displayName || "Google Client",
                    email: user.email,
                    phone: phone,
                    timestamp: new Date()
                });

                // Sync phone number
                localStorage.setItem('clientPhone', phone);
                
                alert("Profile completed successfully! Welcome to Sualkuchi Heritage Silks.");
                
                // Switch view immediately
                profileName.innerText = user.displayName || "Google Client";
                profileEmail.innerText = user.email;
                profilePhone.innerText = phone;
                
                loggedOutView.style.display = 'none';
                loggedInView.style.display = 'block';
                const completeProfilePanel = document.getElementById('complete-profile-panel');
                if (completeProfilePanel) {
                    completeProfilePanel.style.display = 'none';
                }

            } catch (error) {
                console.error("[Customer Profile] Failed to save phone number:", error);
                alert("Failed to complete profile: " + error.message);
                completeSubmitBtn.disabled = false;
                completeSubmitBtn.innerText = "Submit & Finish";
            }
        });
    }
});
