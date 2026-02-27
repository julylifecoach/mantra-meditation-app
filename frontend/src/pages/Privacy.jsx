import React from 'react';

export default function Privacy() {
    return (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '2rem auto' }}>
            <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Privacy Policy</h1>
            <p>Last updated: 2026‑02‑26</p>
            <section style={{ marginTop: '2rem' }}>
                <h2>1. Information We Collect</h2>
                <p>We collect the email address, Google profile information, nickname you set, and usage data such as timer activity and reflections you save.</p>
            </section>
            <section style={{ marginTop: '1.5rem' }}>
                <h2>2. How We Use Your Data</h2>
                <p>Data is used to authenticate you, personalize your experience, store your reflections, and provide analytics for your progress. We never sell your data to third parties.</p>
            </section>
            <section style={{ marginTop: '1.5rem' }}>
                <h2>3. Data Sharing</h2>
                <p>We may share aggregated, anonymized usage statistics with service providers (e.g., hosting, analytics). Individual user data is only shared with your explicit consent (e.g., posting a reflection publicly).</p>
            </section>
            <section style={{ marginTop: '1.5rem' }}>
                <h2>4. Your Rights</h2>
                <p>You may request a copy of your data, update your nickname, or delete your account. Deleting your account removes all personal data from our servers.</p>
            </section>
            <section style={{ marginTop: '1.5rem' }}>
                <h2>5. Security</h2>
                <p>We store data in a PostgreSQL database behind a firewall and use HTTPS for all communications. Passwords are not stored; we rely on Google OAuth tokens.</p>
            </section>
            <section style={{ marginTop: '1.5rem' }}>
                <h2>6. Changes to This Policy</h2>
                <p>We may update this policy. Changes will be posted here with an updated date.</p>
            </section>
        </div>
    );
}
