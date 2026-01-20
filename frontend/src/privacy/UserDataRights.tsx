import React from 'react';
import { UserCheck, Trash2, Edit, Scale } from 'lucide-react';

export const UserDataRights = () => {
    return (
        <div className="max-w-4xl mx-auto p-8 animate-fade-in text-[var(--text-primary)]">
            <div className="mb-8 flex items-center gap-4">
                <div className="p-3 bg-indigo-100 text-indigo-700 rounded-full">
                    <UserCheck size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Your Data Rights</h1>
                    <p className="text-[var(--text-secondary)]">Empowering you with control over your personal information.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6 border-l-4 border-blue-500">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Scale size={20} /> Right to Access</h3>
                    <p className="text-sm text-gray-600 mb-4">You have the right to request a copy of all personal data we hold about you.</p>
                    <div className="mt-auto">
                        <button className="text-blue-600 text-sm font-bold hover:underline">View Dashboard Data &rarr;</button>
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-green-500">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Edit size={20} /> Right to Rectification</h3>
                    <p className="text-sm text-gray-600 mb-4">If your data (e.g., Name, Phone) is incorrect, you have the right to have it corrected immediately.</p>
                    <div className="mt-auto">
                        <span className="text-sm bg-gray-100 px-2 py-1 rounded">Contact Admin</span>
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-red-500">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Trash2 size={20} /> Right to Erasure</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        "Right to be Forgotten". You may request deletion of your data if it is no longer necessary for the academic purpose (e.g., upon graduation).
                    </p>
                    <div className="mt-auto">
                        <p className="text-xs text-red-400">Note: Academic records may be retained as required by Education Law.</p>
                    </div>
                </div>
            </div>

            <div className="mt-8 glass-card p-8">
                <h3 className="font-bold text-lg mb-4">How to Exercise Your Rights details</h3>
                <p className="mb-4">
                    To exercise any of these rights, please contact the Data Protection Officer (DPO).
                </p>
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                    <p><strong>Email:</strong> dpo@ovalent.ac.ke</p>
                    <p><strong>Phone:</strong> +254 700 000 000</p>
                    <p><strong>Physical Office:</strong> Administration Block, Room 101</p>
                </div>
                <p className="mt-4 text-sm text-[var(--text-secondary)]">We will respond to all requests within 14 days, as mandated by the Kenya Data Protection Act.</p>
            </div>
        </div>
    );
};
