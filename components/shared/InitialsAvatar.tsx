import React from "react";

interface InitialsAvatarProps {
  name: string;
  size?: number | string;
  className?: string;
}

export default function InitialsAvatar({ name, size, className }: InitialsAvatarProps) {
  const cleanName = name ? name.trim() : "User";
  const firstLetter = cleanName.charAt(0).toUpperCase();

  // Compute initials (e.g. "Ali Ahmed" -> "AA")
  const parts = cleanName.split(/\s+/);
  const initials =
    parts.length > 1
      ? (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
      : firstLetter;

  // Determine consistent color group based on first letter:
  // A-E: Blue | F-J: Green | K-O: Purple | P-T: Orange | U-Z: Red
  let colorClass = "bg-blue-600 text-white"; // default A-E
  if (firstLetter >= "F" && firstLetter <= "J") {
    colorClass = "bg-emerald-600 text-white";
  } else if (firstLetter >= "K" && firstLetter <= "O") {
    colorClass = "bg-purple-600 text-white";
  } else if (firstLetter >= "P" && firstLetter <= "T") {
    colorClass = "bg-orange-600 text-white";
  } else if (firstLetter >= "U" && firstLetter <= "Z") {
    colorClass = "bg-rose-600 text-white";
  }

  // Handle custom numeric sizes or let Tailwind class handle size
  const sizeStyles = typeof size === "number"
    ? { width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(10, size / 2.5)}px` }
    : {};

  return (
    <div
      style={sizeStyles}
      className={`flex items-center justify-center rounded-full font-semibold uppercase tracking-wider select-none shrink-0 ${colorClass} ${className || ""}`}
    >
      {initials}
    </div>
  );
}
