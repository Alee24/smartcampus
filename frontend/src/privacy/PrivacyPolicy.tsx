import React from 'react';
import { Shield, Lock, FileText, Database } from 'lucide-react';

export const PrivacyPolicy = () => {
    return (
        <div className="max-w-4xl mx-auto p-8 animate-fade-in text-[var(--text-primary)]">
            <div className="mb-8 flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-700 rounded-full">
                    <Shield size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Privacy Policy</h1>
                    <p className="text-[var(--text-secondary)]">Compliance with Kenya Data Protection Act 2019</p>
                </div>
            </div>

            <div className="space-y-8 glass-card p-8">
                <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-600">
                        <Database size={20} /> 1. Data Collection & Minimization
                    </h2>
                    <p className="mb-4 text-justify leading-relaxed">
                        In strict adherence to the <strong>Data Minimization</strong> principle, Ovalent GatePass collects only personal data that is <strong>strictly necessary</strong> for the functionality of Campus Security and Attendance Tracking.
                    </p>
                    <ul className="list-disc pl-6 space-y-2 text-sm text-[var(--text-secondary)]">
                        <li><strong>Personal Identifiers:</strong> Name, Admission Number, School Email (for identification).</li>
                        <li><strong>Biometric Data:</strong> Facial Embeddings (converted to numerical vectors, original images encrypted or discarded) for Gate Access & Attendance.</li>
                        <li><strong>Location Data:</strong> Precise GPS coordinates (Login & Attendance only) for geophysical verification of class presence.</li>
                        <li><strong>Device Data:</strong> IP Address and Connection Type for security auditing (Section 3(c) of the User Consent Policy).</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-600">
                        <Lock size={20} /> 2. Lawful Basis & Sensitive Data
                    </h2>
                    <p className="mb-4 text-justify leading-relaxed">
                        We process sensitive personal data (Biometrics, Location) based on <strong>Explicit Consent</strong> obtained during account activation and login (The "Security Verification" check).
                    </p>
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500 text-sm">
                        Data is processed solely for the purpose of <strong>Campus Safety, Security, and Academic Integrity</strong>. It is never reused for marketing, profiling, or sold to third parties.
                    </div>
                </section>

                <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-600">
                        <FileText size={20} /> 3. Data Retention & Storage
                    </h2>
                    <p className="text-justify leading-relaxed">
                        Data is stored securely on encrypted servers.
                        <ul className="list-disc pl-6 mt-2 space-y-1">
                            <li><strong>Attendance Records:</strong> Retained for the duration of the academic semester + 1 year for audit.</li>
                            <li><strong>Biometric Data:</strong> Retained only while the student is active. Deleted upon graduation or exit.</li>
                            <li><strong>Session Logs:</strong> Ephemeral storage, automatically purged after 30 days.</li>
                        </ul>
                    </p>
                </section>

                <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-500 text-center">
                    Reference: Kenya Data Protection Act (2019), Part IV - Principles of Data Protection.
                </div>
            </div>
        </div>
    );
};
