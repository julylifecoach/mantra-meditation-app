import React from 'react';

export default function Terms() {
    return (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '2rem auto' }}>
            <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Terms of Service</h1>
            <p>Last updated: 2026‑02‑26</p>
            <section style={{ marginTop: '2rem' }}>
                <h2>1. Service Description</h2>
                <p>Practice offers a free tier and a paid “Premium” tier that includes advanced timer controls, ad‑free experience, prostration mode, and priority support.</p>
            </section>
            <section style={{ marginTop: '1.5rem' }}>
                <h2>2. Subscription & Billing</h2>
                <p>Subscriptions are billed monthly or annually (as selected). Payments are processed by Stripe and are non‑refundable after the first 7 days.</p>
            </section>
            <section style={{ marginTop: '1.5rem' }}>
                <h2>3. Refund Policy</h2>
                <p>Full refunds are available within 7 days of purchase. After that period no refunds will be issued.</p>
            </section>
            <section style={{ marginTop: '1.5rem' }}>
                <h2>4. User Conduct</h2>
                <p>Users must not post illegal, hateful, or spammy content. Violations may result in termination.</p>
            </section>
            <section style={{ marginTop: '1.5rem' }}>
                <h2>5. Intellectual Property</h2>
                <p>All code and design assets are owned by the Practice team. Users grant a non‑exclusive license to display their reflections and nickname.</p>
            </section>
            <section style={{ marginTop: '1.5rem' }}>
                <h2>6. Limitation of Liability</h2>
                <p>Practice is provided “as is”. We are not liable for indirect or consequential damages.</p>
            </section>
            <section style={{ marginTop: '1.5rem' }}>
                <h2>7. Governing Law & Dispute Resolution</h2>
                <p>These terms are governed by the laws of the State of California, USA. Any dispute will be resolved by binding arbitration.</p>
            </section>
        </div>
    );
}
