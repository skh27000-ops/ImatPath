/* Paid access settings.
   ENABLED: false  -> nobody is blocked (current behaviour).
   ENABLED: true   -> only accounts with an active row in the "entitlements" table can use the app.
   CHECKOUT: the Polar checkout link of each product (Catalog -> Checkout Links). Empty = no online payment. */
window.ImatPay = {
  ENABLED: false,
  CHECKOUT: {
    selfstudy: 'https://buy.polar.sh/polar_cl_bh8BnGwcQEOZdexy0eTrIAqey3lBR76fyc4zX27G46Q',
    application: ''
  }
};
