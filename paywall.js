// paywall.js

function loadPayPalScript() {
  return new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve(window.paypal);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${window.ImatConfig.PAYPAL_CLIENT_ID}&currency=USD`;
    script.onload = () => resolve(window.paypal);
    script.onerror = () => reject(new Error('PayPal SDK failed to load.'));
    document.head.appendChild(script);
  });
}

async function renderPayPalButtons(session) {
  try {
    const paypal = await loadPayPalScript();
    
    // Clear the container first in case it's re-rendered
    const container = document.getElementById('paypal-button-container');
    if(container) container.innerHTML = '';
    
    paypal.Buttons({
      style: {
        layout: 'vertical',
        color:  'gold',
        shape:  'rect',
        label:  'checkout'
      },
      createOrder: function(data, actions) {
        return actions.order.create({
          purchase_units: [{
            description: 'ImatPath Until Exam 2026',
            amount: {
              value: '1.00'
            }
          }]
        });
      },
      onApprove: function(data, actions) {
        return actions.order.capture().then(async function(details) {
          // Payment successful!
          // Update user metadata in Supabase (MVP approach: frontend update)
          const { data: updateData, error } = await window.ImatAuth.client.auth.updateUser({
            data: { is_premium: true }
          });
          
          if (error) {
            console.error('Error updating user status:', error);
            alert('Payment successful, but there was an error unlocking your account. Please contact support.');
            return;
          }
          
          // Hide paywall and restore scrolling
          const paywall = document.getElementById('paywallOverlay');
          if (paywall) paywall.classList.remove('active');
          document.body.style.overflow = 'auto';
          
          alert('Payment Successful! Premium access unlocked. Welcome to ImatPath!');
          window.location.reload();
        });
      },
      onError: function(err) {
        console.error('PayPal Checkout Error:', err);
      }
    }).render('#paypal-button-container');
    
  } catch (err) {
    console.error(err);
  }
}
