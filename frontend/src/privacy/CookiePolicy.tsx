import React from 'react';
import { Cookie, Info } from 'lucide-react';

export const CookiePolicy = () => {
    return (
        <div className="max-w-4xl mx-auto p-8 animate-fade-in text-[var(--text-primary)]">
            <div className="mb-8 flex items-center gap-4">
                <div className="p-3 bg-orange-100 text-orange-700 rounded-full">
                    <Cookie size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Cookie & Storage Policy</h1>
                    <p className="text-[var(--text-secondary)]">Transparency on Local Data Storage</p>
                </div>
            </div>

            <div className="space-y-8 glass-card p-8">
                <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-600">
                        <Info size={20} /> Strictly Necessary Storage
                    </h2>
                    <p className="mb-4 text-justify leading-relaxed">
                        Ovalent GatePass utilizes <strong>zero</strong> tracking or marketing cookies. We strictly utilize "Local Storage" and "Session Cookies" essential for system functionality.
                    </p>
                </section>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800">
                                <th className="p-4 border">Data Name</th>
                                <th className="p-4 border">Type</th>
                                <th className="p-4 border">Purpose</th>
                                <th className="p-4 border">Duration</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b">
                                <td className="p-4 font-mono text-indigo-600">token</td>
                                <td className="p-4">LocalStorage</td>
                                <td className="p-4">Encrypted Authentication Token (JWT) to keep you logged in.</td>
                                <td className="p-4">Session (Manual Logout)</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-4 font-mono text-indigo-600">security_checked</td>
                                <td className="p-4">SessionStorage</td>
                                <td className="p-4">Flags that you have completed the "Security Verification" check for this browser session.</td>
                                <td className="p-4">Until Tab Close</td>
                            </tr>
                            <tr className="border-b">
                                <td className="p-4 font-mono text-indigo-600">theme</td>
                                <td className="p-4">LocalStorage</td>
                                <td className="p-4">Remembers your Dark Mode preference.</td>
                                <td className="p-4">Persistent</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                    <strong>Note:</strong> We do not use Google Analytics, Facebook Pixels, or any third-party advertising trackers. Your browsing activity on this platform is private.
                </div>
            </div>
        </div>
    );
};
