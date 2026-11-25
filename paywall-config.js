/* Paid access settings.
   ENABLED: false  -> nobody is blocked (current behaviour).
   ENABLED: true   -> only accounts with an active row in the "entitlements" table can use the app.
   CHECKOUT: the Lemon Squeezy checkout link of each product (Share -> Copy link in the product). */
window.ImatPay = {
  ENABLED: false,
  CHECKOUT: {
    selfstudy: '',      // e.g. https://imatpath.lemonsqueezy.com/checkout/buy/xxxxxxxx
    application: ''
  }
};
