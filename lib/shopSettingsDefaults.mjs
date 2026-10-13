export const SHOP_SETTINGS_DEFAULTS = Object.freeze({
  currency: 'EUR',
  tax: Object.freeze({ pricesIncludeVat: true, vatRatePercent: 21 }),
  contact: Object.freeze({ email: 'info@ilab.lv', phone: '+371 23370088' }),
  invoicing: Object.freeze({ sellerName: 'SIA iLab', legalAddress: 'Ieriķu iela 3, Rīga, LV-1084', registrationNumber: '40203288307', vatNumber: 'LV40203288307', bankName: 'AS Citadele banka', bic: 'PARXLV2X', iban: 'LV24PARX0023768390002', invoicePrefix: 'SH', paymentDueDays: 7, electronicDocumentNote: 'Rēķins ir sagatavots elektroniski un ir derīgs bez paraksta' }),
  pickupLocations: Object.freeze([
    Object.freeze({ id: 'domina', name: 'Domina Shopping', address: 'Ieriķu iela 3, Rīga, LV-1084', phone: '+371 23370088', email: 'info@ilab.lv', whatsapp: 'https://wa.me/37123370088', directions: 'https://www.google.com/maps/dir/?api=1&destination=iLab+Domina&destination_place_id=ChIJPdbptEPP7kYRsN9Te_ffHcg', hours: Object.freeze(['Mon–Sat 10:00–21:00', 'Sun 10:00–21:00']), status: 'active', order: 0 }),
    Object.freeze({ id: 'spice', name: 'Spice Life', address: 'Jaunmoku iela 13, Rīga, LV-1046', phone: '+371 20887787', email: 'ilab.spice@gmail.com', whatsapp: 'https://wa.me/37120887787', directions: 'https://www.google.com/maps/dir/?api=1&destination=iLab+Spice&destination_place_id=ChIJ-44HHgDR7kYRDtqN_4qtGn0', hours: Object.freeze(['Mon–Sat 10:00–21:00', 'Sun 10:00–20:00']), status: 'active', order: 1 }),
  ]),
});
