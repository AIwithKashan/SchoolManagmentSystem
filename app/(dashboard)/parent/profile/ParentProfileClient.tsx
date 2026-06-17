"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Phone,
  Mail,
  FileText,
  Briefcase,
  GraduationCap,
  Calendar,
  Building,
  Upload,
  Loader2,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface ParentProfile {
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  cnic: string;
  occupation: string;
  relationship: string;
  principalId: string;
}

interface ChildProfile {
  id: string;
  name: string;
  rollNumber: string;
  className: string;
  section: string;
  admissionNumber: string;
  admissionDate: string;
  teacherName: string;
  teacherContact: string;
}

export default function ParentProfileClient() {
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit fields states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [occupation, setOccupation] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  // Flow states
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchProfileData = async () => {
    try {
      const res = await fetch("/api/parent/profile");
      if (!res.ok) throw new Error("Failed to load profile details");
      const data = await res.json();
      
      setProfile(data.parent);
      setChildren(data.children);

      // Initialize inputs
      setName(data.parent.name);
      setEmail(data.parent.email);
      setPhone(data.parent.phone);
      setCnic(data.parent.cnic);
      setOccupation(data.parent.occupation);
      setAvatar(data.parent.avatar);
    } catch (err: any) {
      console.error(err);
      toast.error("Could not fetch profile details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  // Simulated Avatar File Upload Process
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation checks: 5MB size limit
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum size allowed is 5MB.");
      return;
    }

    setUploading(true);

    // Simulate upload delay
    setTimeout(() => {
      // Mock generated avatar URL path
      const mockAvatarUrl = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250&h=250`;
      setAvatar(mockAvatarUrl);
      setUploading(false);
      toast.success("Avatar image uploaded successfully!");
    }, 1500);
  };

  // Submit Profile Edits
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and Email are required fields.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/parent/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          avatar,
          cnic,
          occupation,
        }),
      });

      if (!res.ok) throw new Error("Could not update profile details");

      toast.success("Profile changes saved successfully!");
      fetchProfileData();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  // Get Initials for Avatar Fallback
  const getInitials = (userName: string) => {
    return userName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 text-gray-500 text-sm">
        Loading parent profile data...
      </div>
    );
  }

  const principalMessageText = `Dear Principal,\n\nI would like to request an update for my child's profile info.\nChild Name: ${children[0]?.name || "N/A"}\nClass: ${children[0]?.className || "N/A"}\n\nThe requested corrections are as follows:\n[Type required changes here]`;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <User className="size-8 text-blue-400" />
          My Profile
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Review linked student information and manage your contact details.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── SECTION A: Parent Profile (Left Panel) ── */}
        <Card className="lg:col-span-7 border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
          <CardHeader className="pb-3 border-b border-white/[0.05]">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <User className="size-4 text-blue-400" />
              Parent Profile Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Profile Avatar Upload */}
              <div className="flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/[0.04]">
                <div className="relative shrink-0 select-none">
                  <Avatar size="lg" className="size-20 border border-white/[0.08] shadow-md">
                    {avatar ? <AvatarImage src={avatar} alt={name} /> : null}
                    <AvatarFallback className="bg-gray-800 text-gray-200 text-xl font-bold">
                      {getInitials(name || "Parent")}
                    </AvatarFallback>
                  </Avatar>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                      <Loader2 className="size-5 text-blue-400 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Profile Photo</h4>
                  <p className="text-[10px] text-gray-500">PNG, JPG or JPEG up to 5MB.</p>
                  
                  <div className="relative">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={handleAvatarChange}
                      disabled={uploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold py-1.5 px-3 rounded-lg border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] hover:text-white transition-all"
                    >
                      <Upload className="size-3.5" />
                      Upload Avatar
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Input Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500/50"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Phone Number (Login ID)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 size-3.5 text-gray-500" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +923001234567"
                      className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>

                {/* CNIC */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">CNIC / ID Card</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 size-3.5 text-gray-500" />
                    <input
                      type="text"
                      value={cnic}
                      onChange={(e) => setCnic(e.target.value)}
                      placeholder="e.g. 42101-1234567-1"
                      className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>

                {/* Occupation */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Occupation</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 size-3.5 text-gray-500" />
                    <input
                      type="text"
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="e.g. Software Engineer"
                      className="w-full bg-black/40 border border-white/[0.08] text-white text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>

                {/* Relationship (Read-Only) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Relationship to Child</label>
                  <div className="w-full bg-white/[0.01] border border-white/[0.04] text-gray-400 text-xs rounded-xl px-3 py-2.5 select-none flex items-center justify-between">
                    <span>{profile?.relationship || "Guardian"}</span>
                    <Badge className="bg-white/[0.04] text-gray-400 border border-white/[0.08] rounded text-[9px]">
                      Read-Only
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-3 border-t border-white/[0.04] flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-all shadow-md shadow-blue-500/10 font-bold"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="size-3.5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* ── SECTION B: Child Information (Right Panel - Read-Only) ── */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border border-white/[0.06] bg-gray-900/60 backdrop-blur-xl rounded-xl">
            <CardHeader className="pb-3 border-b border-white/[0.05]">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <GraduationCap className="size-4 text-purple-400" />
                Linked Child Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {children.map((child) => (
                <div
                  key={child.id}
                  className="bg-black/20 p-4 border border-white/[0.04] rounded-xl space-y-4"
                >
                  {/* Child header */}
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="size-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white leading-none">{child.name}</h4>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1 leading-none">
                        <span>{child.className} - {child.section}</span>
                        <span>•</span>
                        <span>Roll: {child.rollNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* Child details metadata */}
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-1 text-[11px] text-gray-400">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-gray-500 uppercase font-semibold">Admission No:</span>
                      <p className="font-bold text-white">{child.admissionNumber}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-gray-500 uppercase font-semibold">Admission Date:</span>
                      <p className="font-bold text-white flex items-center gap-1">
                        <Calendar className="size-3 text-gray-600" />
                        {new Date(child.admissionDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-y-0.5 col-span-2">
                      <span className="text-[9px] text-gray-500 uppercase font-semibold block">Class Teacher:</span>
                      <p className="font-bold text-white">{child.teacherName}</p>
                      <span className="text-[10px] text-gray-500 block mt-0.5">Contact: {child.teacherContact}</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* School contact actions warning */}
              <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-3.5 flex items-start gap-2.5 text-[11px] text-blue-300 leading-relaxed">
                <HelpCircle className="size-4 shrink-0 text-blue-400 mt-0.5" />
                <p>
                  Child profile information is managed centrally by school enrollment authorities and cannot be edited by parents. To request updates, please contact the Principal.
                </p>
              </div>

              {profile?.principalId && (
                <Link
                  href={`/parent/messages?recipientId=${profile.principalId}&text=${encodeURIComponent(principalMessageText)}`}
                  className="w-full inline-flex items-center justify-center text-xs font-semibold py-2.5 px-4 rounded-xl border border-white/[0.08] bg-white/[0.02] text-gray-300 hover:bg-white/[0.06] hover:text-white transition-all text-center"
                >
                  Contact School to Update Child Info
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
