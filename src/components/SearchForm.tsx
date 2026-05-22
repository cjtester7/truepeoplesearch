import React, { useState } from "react";
import { SearchType, SearchCriteria } from "../types";
import { User, Phone, MapPin, Search, Sparkles } from "lucide-react";

interface SearchFormProps {
  onSearch: (criteria: SearchCriteria) => void;
  isLoading: boolean;
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [activeTab, setActiveTab] = useState<SearchType>("name");
  
  // Specific inputs state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [location, setLocation] = useState("");

  const [phone, setPhone] = useState("");

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    let query = "";
    let combinedLocation = "";

    if (activeTab === "name") {
      if (!lastName.trim()) return;
      query = firstName.trim() ? `${firstName.trim()} ${lastName.trim()}` : lastName.trim();
      combinedLocation = location.trim();
    } else if (activeTab === "phone") {
      if (!phone.trim()) return;
      query = phone.trim();
    } else if (activeTab === "address") {
      if (!street.trim()) return;
      query = street.trim();
      combinedLocation = [city.trim(), stateCode.trim()].filter(Boolean).join(", ");
    }

    onSearch({
      type: activeTab,
      query,
      location: combinedLocation
    });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue.length <= 10) {
      setPhone(rawValue);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
      {/* Search Mode Selector Tabs - Laid out as a vertical stack for sidebars */}
      <div className="flex flex-col bg-slate-50/50 p-3 gap-1.5 border-b border-slate-100">
        <button
          type="button"
          onClick={() => setActiveTab("name")}
          className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-150 text-left cursor-pointer ${
            activeTab === "name"
              ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
          }`}
          id="tab-name"
        >
          <User className="w-4 h-4" />
          <span>Name Search</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("phone")}
          className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-150 text-left cursor-pointer ${
            activeTab === "phone"
              ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
          }`}
          id="tab-phone"
        >
          <Phone className="w-4 h-4" />
          <span>Phone Search</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("address")}
          className={`flex items-center gap-3 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-150 text-left cursor-pointer ${
            activeTab === "address"
              ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
          }`}
          id="tab-address"
        >
          <MapPin className="w-4 h-4" />
          <span>Address Search</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {activeTab === "name" && (
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="first-name" className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                First Name (Optional)
              </label>
              <input
                id="first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. John"
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none text-slate-800 placeholder-slate-400 text-sm transition-colors duration-150"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="last-name" className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="last-name"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Doe"
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none text-slate-800 placeholder-slate-400 text-sm transition-colors duration-150"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="location" className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                City, State / ZIP (Optional)
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Los Angeles, CA"
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none text-slate-800 placeholder-slate-400 text-sm transition-colors duration-150"
              />
            </div>
          </div>
        )}

        {activeTab === "phone" && (
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Phone Number (10 digits) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold select-none">
                  +1
                </span>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="e.g. (213) 555-0199"
                  className="pl-10 pr-3.5 py-2.5 w-full rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none text-slate-800 placeholder-slate-400 text-sm transition-colors duration-150"
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Only numbers are allowed. Format compiles dynamically.
              </p>
            </div>
          </div>
        )}

        {activeTab === "address" && (
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="street" className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Street Address <span className="text-rose-500">*</span>
              </label>
              <input
                id="street"
                type="text"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="e.g. 1600 Amphitheatre Pkwy"
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none text-slate-800 placeholder-slate-400 text-sm transition-colors duration-150"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="city" className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Mountain View"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none text-slate-800 placeholder-slate-400 text-xs transition-colors duration-150"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="state-code" className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  State/ZIP
                </label>
                <input
                  id="state-code"
                  type="text"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  placeholder="CA"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none text-slate-800 placeholder-slate-400 text-xs transition-colors duration-150"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Button Strip */}
        <div className="flex flex-col pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={isLoading || (activeTab === "name" && !lastName) || (activeTab === "phone" && phone.length < 10) || (activeTab === "address" && !street)}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white font-medium hover:bg-slate-800 w-full py-2.5 text-sm rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
            id="btn-search"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Executing Grounding...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search Records</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
