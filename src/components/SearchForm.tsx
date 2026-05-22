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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Search Mode Selector Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("name")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === "name"
              ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
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
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === "phone"
              ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
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
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
            activeTab === "address"
              ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50"
          }`}
          id="tab-address"
        >
          <MapPin className="w-4 h-4" />
          <span>Address Search</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {activeTab === "name" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="first-name" className="text-xs font-semibold text-slate-500">
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
              <label htmlFor="last-name" className="text-xs font-semibold text-slate-500">
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
              <label htmlFor="location" className="text-xs font-semibold text-slate-500">
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
          <div className="flex flex-col gap-1.5 max-w-md mx-auto">
            <label htmlFor="phone" className="text-xs font-semibold text-slate-500 align-middle">
              Phone Number (10 digits) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
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
            <p className="text-[11px] text-slate-400">
              Only numbers are allowed. Format will automatically compile.
            </p>
          </div>
        )}

        {activeTab === "address" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label htmlFor="street" className="text-xs font-semibold text-slate-500">
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
                <label htmlFor="city" className="text-xs font-semibold text-slate-500">
                  City (Optional)
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mountain View"
                  className="px-3 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none text-slate-800 placeholder-slate-400 text-sm transition-colors duration-150"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="state-code" className="text-xs font-semibold text-slate-500">
                  State/ZIP (Opt)
                </label>
                <input
                  id="state-code"
                  type="text"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  placeholder="e.g. CA"
                  className="px-3 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 focus:outline-none text-slate-800 placeholder-slate-400 text-sm transition-colors duration-150"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Button Strip */}
        <div className="flex justify-end pt-2 border-t border-slate-50">
          <button
            type="submit"
            disabled={isLoading || (activeTab === "name" && !lastName) || (activeTab === "phone" && phone.length < 10) || (activeTab === "address" && !street)}
            className="flex items-center gap-2 bg-slate-900 text-white font-medium hover:bg-slate-800 px-6 py-2.5 text-sm rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-slate-900/10"
            id="btn-search"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Invoking Search Grounding...</span>
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
