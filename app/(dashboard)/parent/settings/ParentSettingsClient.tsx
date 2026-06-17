"use client";

import React, { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import {
  Bell,
  Sliders,
  Globe,
  Lock,
  LogOut,
  Loader2,
  CheckCircle,
  HelpCircle,
  Mail,
  Phone,
  Shield,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ParentSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Notification Preferences states
  const [notifAttendance, setNotifAttendance] = useState(true);
  const [notifAssignment, setNotifAssignment] = useState(true);
  const [notifGrade, setNotifGrade] = useState(true);
  const [notifFee, setNotifFee] = useState(true);
  const [notifAnnounce, setNotifAnnounce] = useState(true);

  // Notification Channels states
  const [chanWhatsapp, setChanWhatsapp] = useState(false);
  const [chanWhatsappNum, setChanWhatsappNum] = useState("");
  const [chanEmail, setChanEmail] = useState(false);
  const [chanEmailAddr, setChanEmailAddr] = useState("");
  const [chanSms, setChanSms] = useState(false);

  // Language & Privacy states
  const [language, setLanguage] = useState("en");
  const [privSeeContact, setPrivSeeContact] = useState(true);
  const [privNewsletter, setPrivNewsletter] = useState(false);

  // Change Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Fetch Settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/parent/settings");
        if (!res.ok) throw new Error("Failed to load settings");
        const data = await res.json();

        // Bind states
        setNotifAttendance(data.notifications.attendance);
        setNotifAssignment(data.notifications.assignment);
        setNotifGrade(data.notifications.grade);
        setNotifFee(data.notifications.fee);
        setNotifAnnounce(data.notifications.announcement);

        setChanWhatsapp(data.channels.whatsapp);
        setChanWhatsappNum(data.channels.whatsappNumber || "");
        setChanEmail(data.channels.email);
        setChanEmailAddr(data.channels.emailAddress || "");
        setChanSms(data.channels.sms);

        setLanguage(data.language);
        setPrivSeeContact(data.privacy.schoolSeeContact);
        setPrivNewsletter(data.privacy.newsletter);
      } catch (err: any) {
        console.error(err);
        toast.error("Could not fetch settings preferences.");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Save Settings Trigger
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/parent/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifications: {
            attendance: notifAttendance,
            assignment: notifAssignment,
            grade: notifGrade,
            fee: notifFee,
            announcement: notifAnnounce,
            emergency: true, // enforced
          },
          channels: {
            inApp: true, // enforced
            whatsapp: chanWhatsapp,
            whatsappNumber: chanWhatsappNum,
            email: chanEmail,
            emailAddress: chanEmailAddr,
            sms: chanSms,
          },
          language,
          privacy: {
            schoolSeeContact: privSeeContact,
            newsletter: privNewsletter,
          },
        }),
      });

      if (!res.ok) throw new Error("Could not update settings");

      toast.success("Settings saved successfully");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save settings preferences.");
    } finally {
      setSaving(false);
    }
  };

  // Change Password Trigger
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await fetch("/api/parent/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password change failed");

      toast.success("Password updated successfully!");
      // Reset fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Logout from all devices trigger
  const handleLogoutAll = () => {
    const confirmLogout = window.confirm("Are you sure you want to log out from all devices? This will terminate all active login sessions.");
    if (confirmLogout) {
      toast.info("Logging out from all devices...");
      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 1000);
    }
  };

  // Helper Custom Toggle Switch Component
  const ToggleSwitch = ({
    checked,
    onChange,
    disabled = false,
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
  }) => {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
          checked ? "bg-blue-600" : "bg-gray-800"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 text-gray-500 text-sm">
        Loading preferences cockpit...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <Sliders className="size-8 text-blue-400" />
          Settings Configuration
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Configure notifications rules, update channel destinations, and manage your account.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT CONFIGURATIONS COLUMN (Toggles and selectors) ── */}
        <div className="lg:col-span-7 space-y-6">
          {/* Notification Preferences */}
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
            <CardHeader className="pb-3 border-b border-white/[0.05]">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Bell className="size-4 text-blue-400" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 divide-y divide-white/[0.04] space-y-4">
              {[
                { label: "Attendance notifications", desc: "Receive immediate alerts when your child is marked absent or late.", state: notifAttendance, setter: setNotifAttendance },
                { label: "Assignment notifications", desc: "Get notifications when new homework or projects are published.", state: notifAssignment, setter: setNotifAssignment },
                { label: "Grade/Result notifications", desc: "Get notified when exam results and report cards are released.", state: notifGrade, setter: setNotifGrade },
                { label: "Fee reminders", desc: "Receive automated alerts for pending invoices and due dates.", state: notifFee, setter: setNotifFee },
                { label: "School announcements", desc: "Get notified about school events, updates, and news.", state: notifAnnounce, setter: setNotifAnnounce },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4 pt-4 first:pt-0">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white leading-none">{item.label}</h4>
                    <p className="text-[10px] text-gray-500 max-w-sm">{item.desc}</p>
                  </div>
                  <ToggleSwitch checked={item.state} onChange={item.setter} />
                </div>
              ))}

              {/* Emergency alerts (locked ON) */}
              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white leading-none">Emergency alerts</h4>
                  <p className="text-[10px] text-gray-500 max-w-sm">Crucial weather advisories, sudden closures, or safety notifications.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-950 text-red-400 border border-red-900/30 rounded text-[9px] font-bold">
                    Required
                  </Badge>
                  <ToggleSwitch checked={true} onChange={() => {}} disabled={true} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Channels */}
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
            <CardHeader className="pb-3 border-b border-white/[0.05]">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Building2 className="size-4 text-purple-400" />
                Notification Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
              {/* In-App Channel (locked ON) */}
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white leading-none">In-app notifications</h4>
                  <p className="text-[10px] text-gray-500">Alerts in your parent portal notification center.</p>
                </div>
                <ToggleSwitch checked={true} onChange={() => {}} disabled={true} />
              </div>

              {/* WhatsApp notifications */}
              <div className="space-y-2 border-t border-white/[0.04] pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white leading-none">WhatsApp alerts</h4>
                    <p className="text-[10px] text-gray-500">Send notifications directly to your WhatsApp account.</p>
                  </div>
                  <ToggleSwitch checked={chanWhatsapp} onChange={setChanWhatsapp} />
                </div>
                {chanWhatsapp && (
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-3 size-3.5 text-gray-500" />
                    <input
                      type="text"
                      value={chanWhatsappNum}
                      onChange={(e) => setChanWhatsappNum(e.target.value)}
                      placeholder="WhatsApp phone number (e.g. +923001234567)"
                      className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                )}
              </div>

              {/* Email notifications */}
              <div className="space-y-2 border-t border-white/[0.04] pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-white leading-none">Email alerts</h4>
                    <p className="text-[10px] text-gray-500">Deliver digests and alert emails to your inbox.</p>
                  </div>
                  <ToggleSwitch checked={chanEmail} onChange={setChanEmail} />
                </div>
                {chanEmail && (
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-3 size-3.5 text-gray-500" />
                    <input
                      type="email"
                      value={chanEmailAddr}
                      onChange={(e) => setChanEmailAddr(e.target.value)}
                      placeholder="Delivery email address"
                      className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                )}
              </div>

              {/* SMS notifications */}
              <div className="flex items-center justify-between gap-4 border-t border-white/[0.04] pt-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white leading-none">SMS notifications</h4>
                  <p className="text-[10px] text-gray-500">Send texts to your registered mobile number.</p>
                </div>
                <ToggleSwitch checked={chanSms} onChange={setChanSms} />
              </div>
            </CardContent>
          </Card>

          {/* Language Preferences */}
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
            <CardHeader className="pb-3 border-b border-white/[0.05]">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Globe className="size-4 text-emerald-400" />
                Language Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white leading-none">Display Language</h4>
                <p className="text-[10px] text-gray-500">Choose your preferred language for the portal layout.</p>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2 cursor-pointer focus:outline-none focus:border-blue-500/50"
              >
                <option value="en">English (Default)</option>
                <option value="ur">اردو (Urdu)</option>
              </select>
            </CardContent>
          </Card>

          {/* Privacy preferences */}
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
            <CardHeader className="pb-3 border-b border-white/[0.05]">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Shield className="size-4 text-blue-400" />
                Privacy & Data
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 divide-y divide-white/[0.04] space-y-4">
              <div className="flex items-center justify-between gap-4 pb-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white leading-none">Share Contact Info</h4>
                  <p className="text-[10px] text-gray-500">Allow class teachers and school administrators to view my phone and email details.</p>
                </div>
                <ToggleSwitch checked={privSeeContact} onChange={setPrivSeeContact} />
              </div>
              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white leading-none">Newsletter Subscription</h4>
                  <p className="text-[10px] text-gray-500">Receive weekly reports, school tips, and parent guides.</p>
                </div>
                <ToggleSwitch checked={privNewsletter} onChange={setPrivNewsletter} />
              </div>
            </CardContent>
          </Card>

          {/* Save settings action button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-all shadow-md shadow-blue-500/10 font-bold"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving settings...
                </>
              ) : (
                <>
                  <CheckCircle className="size-3.5" />
                  Save Settings Preferences
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT ACCOUNT CONTROL COLUMN (Password and session logout) ── */}
        <div className="lg:col-span-5 space-y-6">
          {/* Change Password */}
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
            <CardHeader className="pb-3 border-b border-white/[0.05]">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Lock className="size-4 text-purple-400" />
                Security & Password
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {/* Current password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                </div>

                {/* New password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                </div>

                {/* Confirm new password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                </div>

                {/* Submit action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updatingPassword}
                    className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 transition-all font-bold"
                  >
                    {updatingPassword ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Logout from all devices */}
          <Card className="border border-red-500/20 bg-red-950/10 backdrop-blur-xl rounded-xl">
            <CardHeader className="pb-3 border-b border-red-500/10">
              <CardTitle className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                <LogOut className="size-4" />
                Session Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Log out of all active web browser sessions, mobile devices, and tables. You will need to log back in with your password.
              </p>
              <button
                onClick={handleLogoutAll}
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-600/25 text-white transition-all font-bold"
              >
                <LogOut className="size-3.5 text-white" />
                Logout from all devices
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
