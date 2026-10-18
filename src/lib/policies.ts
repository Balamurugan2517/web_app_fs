import { siteConfig } from './site-config';

/**
 * Legal pages. Razorpay and Shiprocket both check that these five pages exist on your live website
 * before approving your account. The text below is a STARTING TEMPLATE – have it reviewed by a lawyer.
 */
export interface Policy { slug: string; title: string; sections: { heading: string; body: string }[] }

export const policies: Policy[] = [
  { slug: 'privacy-policy', title: 'Privacy Policy', sections: [
    { heading: 'What we collect', body: `When you order from ${siteConfig.name} we collect your name, email, phone number and delivery address so that we can process and deliver your order.` },
    { heading: 'Payments', body: 'Card, UPI and net-banking details are entered on Razorpay\'s secure page. We never see or store them.' },
    { heading: 'Sharing', body: 'We share your delivery details only with our courier partner (via Shiprocket) and payment provider (Razorpay), and only to fulfil your order. We do not sell your data.' },
    { heading: 'Your rights', body: `To access, correct or delete your data, write to ${siteConfig.email}.` },
  ] },
  { slug: 'terms-and-conditions', title: 'Terms & Conditions', sections: [
    { heading: 'About these terms', body: `This website is operated by ${siteConfig.legalName} (GSTIN ${siteConfig.gstin}). By placing an order you agree to these terms.` },
    { heading: 'Pricing', body: 'All prices are in Indian Rupees (INR) and include GST. We may correct pricing errors and will tell you before shipping.' },
    { heading: 'Orders', body: 'An order is confirmed once payment is received (or, for Cash on Delivery, once we confirm it). We may cancel an order if an item is unavailable and will refund any payment in full.' },
    { heading: 'Governing law', body: 'These terms are governed by the laws of India. [Add your city] courts have jurisdiction.' },
  ] },
  { slug: 'shipping-policy', title: 'Shipping Policy', sections: [
    { heading: 'Where we deliver', body: 'We deliver across India through Shiprocket courier partners. Enter your PIN code on any product page to check delivery.' },
    { heading: 'Charges', body: 'Shipping is free on all orders.' },
    { heading: 'Delivery time', body: 'Orders are dispatched within [2–3] business days. Delivery usually takes [3–7] business days after dispatch depending on your location.' },
    { heading: 'Tracking', body: 'You receive a tracking link once the order is picked up. You can also view status on your order page.' },
  ] },
  { slug: 'refund-and-cancellation-policy', title: 'Refund & Cancellation Policy', sections: [
    { heading: 'Cancellation', body: 'You can cancel before the order is dispatched by contacting us. Prepaid orders are refunded in full.' },
    { heading: 'Returns', body: 'Unworn items with tags can be returned within [7] days of delivery. Made-to-measure and customised pieces are not returnable.' },
    { heading: 'Refunds', body: 'Approved refunds go back to the original payment method within [5–7] business days of us receiving the item.' },
    { heading: 'Damaged items', body: 'If your order arrives damaged, email us photos within 48 hours and we will arrange a replacement or refund.' },
  ] },
  { slug: 'contact-us', title: 'Contact Us', sections: [
    { heading: 'Customer support', body: `Email: ${siteConfig.email} · Phone: ${siteConfig.phone} · ${siteConfig.supportHours}` },
    { heading: 'Registered address', body: `${siteConfig.legalName}, ${siteConfig.address}` },
  ] },
];

export const getPolicy = (slug: string): Policy | undefined => policies.find((p) => p.slug === slug);
