// Custom Order Creation & Mock Payment Gateway Controller
import { db, collection, addDoc, auth, onAuthStateChanged, doc, getDoc } from '../core/db.js';

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('custom-order-modal');
    const openBtn = document.getElementById('open-custom-order-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const finishBtn = document.getElementById('finish-btn');
    
    // Screens
    const stepForm = document.getElementById('step-form');
    const stepPayment = document.getElementById('step-payment');
    const stepSuccess = document.getElementById('step-success');
    
    // Form Inputs
    const custName = document.getElementById('cust-name');
    const custPhone = document.getElementById('cust-phone');
    const custDesc = document.getElementById('cust-desc');
    const custBudget = document.getElementById('cust-budget');
    const advanceCards = document.querySelectorAll('.advance-card');
    
    // Buttons
    const proceedPaymentBtn = document.getElementById('proceed-payment-btn');
    const submitPaymentBtn = document.getElementById('submit-payment-btn');
    const backFormBtn = document.getElementById('back-form-btn');
    
    // Payment Tabs
    const payUpiTab = document.getElementById('pay-upi-tab');
    const payCardTab = document.getElementById('pay-card-tab');
    const panelUpi = document.getElementById('panel-upi');
    const panelCard = document.getElementById('panel-card');
    const paymentSpinner = document.getElementById('payment-spinner');
    
    // Data labels
    const paymentAmountLabel = document.getElementById('payment-amount-label');
    const successAmountLabel = document.getElementById('success-amount-label');
    const successOrderId = document.getElementById('success-order-id');
    const successShopNameLabel = document.getElementById('success-shop-name');

    // Guest vs Auth Views
    const guestView = document.getElementById('custom-order-guest-view');
    const userView = document.getElementById('custom-order-user-view');
    const guestCancelBtn = document.getElementById('guest-cancel-btn');

    let selectedAdvance = 1000; // default value
    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('id');

    let loggedInCustomer = null;

    if (!modal) return;

    // Listen to Auth State
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log(`[Custom Orders] Authenticated client UID: ${user.uid}`);
            try {
                const customerSnap = await getDoc(doc(db, "customers", user.uid));
                if (customerSnap.exists()) {
                    loggedInCustomer = customerSnap.data();
                    loggedInCustomer.uid = user.uid;
                    
                    // Auto-fill fields
                    custName.value = loggedInCustomer.name || user.displayName || "";
                    custPhone.value = loggedInCustomer.phone || "";
                    
                    if (guestView && userView) {
                        guestView.style.display = 'none';
                        userView.style.display = 'block';
                    }
                } else {
                    // Check if it's a seller
                    const sellerSnap = await getDoc(doc(db, "sellers", user.uid));
                    if (sellerSnap.exists()) {
                        if (guestView && userView) {
                            guestView.style.display = 'block';
                            userView.style.display = 'none';
                            const p = guestView.querySelector('p');
                            if (p) p.innerText = "You are logged in as a Weaver/Seller. Weavers cannot place custom orders.";
                            const a = guestView.querySelector('a');
                            if (a) {
                                a.innerText = "Weaver Portal Dashboard";
                                a.href = "admin.html";
                            }
                        }
                    } else {
                        if (guestView && userView) {
                            guestView.style.display = 'block';
                            userView.style.display = 'none';
                            const p = guestView.querySelector('p');
                            if (p) p.innerText = "Please complete your customer profile with a phone number to place orders.";
                            const a = guestView.querySelector('a');
                            if (a) {
                                a.innerText = "Complete Profile";
                                a.href = "profile.html";
                            }
                        }
                    }
                }
            } catch(e) {
                console.error("[Custom Orders] Failed to fetch customer profile details:", e);
            }
        } else {
            console.log("[Custom Orders] Guest user detected.");
            loggedInCustomer = null;
            custName.value = "";
            custPhone.value = "";
            if (guestView && userView) {
                guestView.style.display = 'block';
                userView.style.display = 'none';
                
                // Restore defaults in case it was modified
                const p = guestView.querySelector('p');
                if (p) p.innerText = "To request custom handloom creations from weavers and securely transfer booking advance payments, you must create a customer account.";
                const a = guestView.querySelector('a');
                if (a) {
                    a.innerText = "Sign In or Create Account";
                    a.href = "profile.html";
                }
            }
        }
    });

    if (guestCancelBtn) {
        guestCancelBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });
    }

    // 1. Modal toggle handlers
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (!sellerId) {
                alert("Cannot place order: Shop details are not initialized.");
                return;
            }
            modal.classList.add('show');
            showScreen(stepForm);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('show');
        });
    }

    if (finishBtn) {
        finishBtn.addEventListener('click', () => {
            modal.classList.remove('show');
            window.location.reload();
        });
    }

    // 2. Advance deposit card selector
    advanceCards.forEach(card => {
        card.addEventListener('click', () => {
            advanceCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedAdvance = Number(card.getAttribute('data-value'));
        });
    });

    // Helper: Toggles between step screens
    function showScreen(screen) {
        stepForm.style.display = 'none';
        stepPayment.style.display = 'none';
        stepSuccess.style.display = 'none';
        
        screen.style.display = 'block';
    }

    // 3. Proceed to Payment validation
    if (proceedPaymentBtn) {
        proceedPaymentBtn.addEventListener('click', () => {
            const name = custName.value.trim();
            const phone = custPhone.value.trim();
            const desc = custDesc.value.trim();
            const budget = custBudget.value.trim();

            if (!name || !phone || !desc || !budget) {
                alert("Please fill in all custom order details (Name, Contact, Specs, and Budget).");
                return;
            }

            console.log(`[Custom Order] Data validated. Transitioning to checkout for advance ₹${selectedAdvance}...`);
            
            // Set payment label values
            paymentAmountLabel.innerText = `₹ ${selectedAdvance.toLocaleString('en-IN')}`;
            
            // Display payment details panel
            panelUpi.style.display = 'block';
            panelCard.style.display = 'none';
            payUpiTab.classList.add('active');
            payCardTab.classList.remove('active');
            
            submitPaymentBtn.style.display = 'block';
            backFormBtn.style.display = 'block';
            paymentSpinner.style.display = 'none';

            showScreen(stepPayment);
        });
    }

    // 4. Tab switching for payment methods
    if (payUpiTab && payCardTab) {
        payUpiTab.addEventListener('click', () => {
            payUpiTab.classList.add('active');
            payCardTab.classList.remove('active');
            panelUpi.style.display = 'block';
            panelCard.style.display = 'none';
        });

        payCardTab.addEventListener('click', () => {
            payCardTab.classList.add('active');
            payUpiTab.classList.remove('active');
            panelCard.style.display = 'block';
            panelUpi.style.display = 'none';
        });
    }

    if (backFormBtn) {
        backFormBtn.addEventListener('click', () => {
            showScreen(stepForm);
        });
    }

    // 5. Submit simulated advance payment & save to database
    if (submitPaymentBtn) {
        submitPaymentBtn.addEventListener('click', async () => {
            const name = custName.value.trim();
            const phone = custPhone.value.trim();
            const desc = custDesc.value.trim();
            const budget = Number(custBudget.value.trim());

            console.log("[Custom Order Payment] Simulating advance escrow deposit verification...");
            
            // Hide panels & buttons, reveal loading spinner
            panelUpi.style.display = 'none';
            panelCard.style.display = 'none';
            payUpiTab.style.display = 'none';
            payCardTab.style.display = 'none';
            submitPaymentBtn.style.display = 'none';
            backFormBtn.style.display = 'none';
            paymentSpinner.style.display = 'block';

            // Simulate network processing check (1.8 seconds delay)
            setTimeout(async () => {
                try {
                    const shopNameText = document.getElementById('seller-shop-name').innerText;
                    
                    const orderData = {
                        sellerId: sellerId,
                        customerName: name,
                        customerContact: phone,
                        customerUid: auth.currentUser ? auth.currentUser.uid : "",
                        description: desc,
                        budget: budget,
                        advancePaid: selectedAdvance,
                        status: "Paid",
                        timestamp: new Date()
                    };

                    console.log("[Custom Order DB] Recording order document into Firestore collection...");
                    const docRef = await addDoc(collection(db, "custom_orders"), orderData);
                    console.log(`[Custom Order DB] Custom order created successfully with ID: ${docRef.id}`);

                    // Prepare Success View
                    successAmountLabel.innerText = `₹ ${selectedAdvance.toLocaleString('en-IN')}`;
                    successOrderId.innerText = docRef.id;
                    successShopNameLabel.innerText = shopNameText;

                    // Transition to Success view
                    paymentSpinner.style.display = 'none';
                    // restore UI items for next modal open state
                    payUpiTab.style.display = 'block';
                    payCardTab.style.display = 'block';
                    showScreen(stepSuccess);

                } catch (e) {
                    console.error("[Custom Order DB] Failed to save custom order details:", e);
                    alert("Mock payment failed to process: " + e.message);
                    
                    // Reset to form
                    paymentSpinner.style.display = 'none';
                    payUpiTab.style.display = 'block';
                    payCardTab.style.display = 'block';
                    showScreen(stepForm);
                }
            }, 1800);
        });
    }
});
