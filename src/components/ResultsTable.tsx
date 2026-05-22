import React, { useState, useMemo } from "react";
import { PersonRecord, SearchSource } from "../types";
import {
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  ChevronsUpDown,
  Search,
  ExternalLink,
  ClipboardCheck,
  Clipboard,
  PhoneCall,
  Mail,
  Locate,
  Users,
  Building,
  RefreshCw
} from "lucide-react";

interface ResultsTableProps {
  results: PersonRecord[];
  sources: SearchSource[];
  isCached: boolean;
  onExport: () => void;
  isExporting: boolean;
  exportedSheetUrl: string | null;
  isSignedIn: boolean;
}

type SortField = "name" | "age" | "currentAddress";
type SortOrder = "asc" | "desc";

export default function ResultsTable({
  results,
  sources,
  isCached,
  onExport,
  isExporting,
  exportedSheetUrl,
  isSignedIn,
}: ResultsTableProps) {
  // Sort, filter, paginated states
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Toggle rows function
  const toggleRow = (index: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Sort toggle handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Copy to clipboard helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1500);
  };

  // Filter & Sorted Computing
  const processedResults = useMemo(() => {
    let output = [...results];

    // 1. Text filtering
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      output = output.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.currentAddress.toLowerCase().includes(lower) ||
          (p.phoneNumbers || []).some((num) => num.includes(lower)) ||
          (p.relatives || []).some((rel) => rel.toLowerCase().includes(lower)) ||
          (p.emailAddresses || []).some((email) => email.toLowerCase().includes(lower))
      );
    }

    // 2. Sorting
    output.sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";

      if (sortField === "age") {
        // Handle "N/A" age or non-parseable ages
        const numA = parseInt(String(valA), 10) || 0;
        const numB = parseInt(String(valB), 10) || 0;
        return sortOrder === "asc" ? numA - numB : numB - numA;
      }

      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    return output;
  }, [results, searchTerm, sortField, sortOrder]);

  // Paginated elements calculation
  const totalItems = processedResults.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Adjust current page if larger than total
  const activePage = currentPage > totalPages ? totalPages : currentPage;

  const paginatedResults = useMemo(() => {
    const startIndex = (activePage - 1) * pageSize;
    return processedResults.slice(startIndex, startIndex + pageSize);
  }, [processedResults, activePage, pageSize]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      {/* Top action bar: Filter results & Export trigger */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pb-4 border-b border-slate-100">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800">Results Directory</h3>
            {isCached ? (
              <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full border border-emerald-100">
                <RefreshCw className="w-3 h-3 animate-pulse text-emerald-600" />
                Cached In Firestore
              </span>
            ) : (
              <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-100">
                Live Grounding Retrieval
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Displaying {totalItems} matches found matching criteria.
          </p>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Quick Filter */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter results..."
              className="pl-9 pr-3 py-1.5 w-full rounded-xl border border-slate-200 text-xs focus:border-slate-400 focus:outline-none placeholder-slate-400 text-slate-700 transition"
            />
          </div>

          {/* Excel Export */}
          <button
            onClick={onExport}
            disabled={isExporting || results.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-medium px-4 py-2 text-xs rounded-xl transition duration-150 active:scale-95 cursor-pointer shadow-sm shadow-emerald-700/10 w-full sm:w-auto justify-center"
            id="btn-export-sheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExporting ? "Exporting..." : "Export to Sheets"}</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet link if exported successfully */}
      {exportedSheetUrl && (
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs text-emerald-800">
          <div className="flex items-center gap-2 text-emerald-700 font-medium">
            <FileSpreadsheet className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>Successfully exported results directory to cloud Google Sheet!</span>
          </div>
          <a
            href={exportedSheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold px-3 py-1 rounded-lg transition-transform text-[11px] flex-shrink-0 cursor-pointer shadow-xs"
          >
            <span>Open Google Sheet</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {totalItems === 0 ? (
        <div className="text-center py-12 bg-slate-50/40 rounded-xl border border-dashed border-slate-100">
          <Building className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-medium text-slate-600">No results found matching filter</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try correcting typos, clearing filters, or narrowing search parameters to query more records.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 w-10"></th>
                <th
                  onClick={() => handleSort("name")}
                  className="py-3 px-4 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100/50 select-none align-middle"
                >
                  <div className="flex items-center gap-1">
                    <span>Full Name</span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("age")}
                  className="py-3 px-4 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100/50 select-none align-middle w-16"
                >
                  <div className="flex items-center gap-1">
                    <span>Age</span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("currentAddress")}
                  className="py-3 px-4 font-semibold text-slate-600 cursor-pointer hover:bg-slate-100/50 select-none align-middle"
                >
                  <div className="flex items-center gap-1">
                    <span>Current Address</span>
                    <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 font-semibold text-slate-600 align-middle">Primary Phone</th>
                <th className="py-3 px-4 font-semibold text-slate-600 align-middle">Relatives</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedResults.map((person, idx) => {
                const uniqueIdx = (activePage - 1) * pageSize + idx;
                const isExpanded = !!expandedRows[uniqueIdx];
                return (
                  <React.Fragment key={uniqueIdx}>
                    <tr
                      onClick={() => toggleRow(uniqueIdx)}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors duration-150"
                    >
                      <td className="py-3.5 px-4 text-center">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 mx-auto" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 mx-auto" />
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{person.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono text-[10px]">
                          {person.age || "N/A"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {person.currentAddress || "Not Available"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono">
                        {person.phoneNumbers?.[0] || "No associated numbers"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {person.relatives?.slice(0, 3).join(", ") || "No records"}
                      </td>
                    </tr>

                    {/* Detailed Collapsible Record Panel */}
                    {isExpanded && (
                      <tr className="bg-slate-50/30">
                        <td colSpan={6} className="p-0">
                          <div className="p-6 border-l-2 border-slate-900 bg-slate-50/50 space-y-5 animate-fade-in">
                            <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                              Complete Directory Record Profile
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Left column: Contact Info (Phonelist, Emails) */}
                              <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                                <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs border-b border-slate-50 pb-2">
                                  <PhoneCall className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Phone Contacts & Emails</span>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block mb-1">
                                      PHONE NUMBERS
                                    </span>
                                    {person.phoneNumbers && person.phoneNumbers.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {person.phoneNumbers.map((phone) => (
                                          <div
                                            key={phone}
                                            className="group flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200/50 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-700 transition"
                                          >
                                            <span>{phone}</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopy(phone);
                                              }}
                                              title="Copy Phone"
                                              className="text-slate-400 hover:text-slate-600 transition"
                                            >
                                              {copiedText === phone ? (
                                                <ClipboardCheck className="w-3 h-3 text-emerald-600" />
                                              ) : (
                                                <Clipboard className="w-3 h-3" />
                                              )}
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-400 italic">No phone lines found.</p>
                                    )}
                                  </div>

                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block mb-1">
                                      EMAIL REGISTERS
                                    </span>
                                    {person.emailAddresses && person.emailAddresses.length > 0 ? (
                                      <div className="flex flex-wrap gap-1.5">
                                        {person.emailAddresses.map((email) => (
                                          <div
                                            key={email}
                                            className="group flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200/50 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-700 transition"
                                          >
                                            <Mail className="w-3 h-3 text-slate-400" />
                                            <span>{email}</span>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopy(email);
                                              }}
                                              title="Copy Email"
                                              className="text-slate-400 hover:text-slate-600"
                                            >
                                              {copiedText === email ? (
                                                <ClipboardCheck className="w-3 h-3 text-emerald-600" />
                                              ) : (
                                                <Clipboard className="w-3 h-3" />
                                              )}
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-slate-400 italic font-normal">
                                        No registered emails found in public lists.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right column: Past Locations History */}
                              <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                                <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs border-b border-slate-50 pb-2">
                                  <Locate className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Residential Address Logs</span>
                                </div>
                                <div className="space-y-2">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block mb-1">
                                      CURRENT DOMICILE
                                    </span>
                                    <p className="text-[11px] text-slate-700 font-medium">
                                      {person.currentAddress || "Not listed."}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 block mb-1">
                                      PREVIOUS LAND REGISTERS
                                    </span>
                                    {person.pastAddresses && person.pastAddresses.length > 0 ? (
                                      <ul className="space-y-1 text-[11px] text-slate-500 list-disc list-inside">
                                        {person.pastAddresses.map((addr) => (
                                          <li key={addr} className="truncate">
                                            {addr}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-xs text-slate-400 italic">No historical addresses.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* bottom banner: Relatives & family associations */}
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs space-y-2">
                              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs border-b border-slate-50 pb-2">
                                <Users className="w-3.5 h-3.5 text-slate-500" />
                                <span>Known Relatives & Family Associates</span>
                              </div>
                              {person.relatives && person.relatives.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {person.relatives.map((rel) => (
                                    <span
                                      key={rel}
                                      className="bg-slate-50 border border-slate-100 text-slate-600 font-medium px-2.5 py-1 rounded-lg text-[10px]"
                                    >
                                      {rel}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">No listed associates found.</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination controls footer */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setCurrentPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 focus:outline-none focus:border-slate-400 text-slate-700 bg-white"
            >
              <option value={5}>5 records</option>
              <option value={10}>10 records</option>
              <option value={20}>20 records</option>
            </select>
            <span>per page</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={activePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed select-none transition"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }).map((_, pageIdx) => {
              const num = pageIdx + 1;
              return (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold select-none transition ${
                    num === activePage
                      ? "bg-slate-900 text-white border border-slate-950"
                      : "text-slate-600 hover:bg-slate-50 border border-slate-200"
                  }`}
                >
                  {num}
                </button>
              );
            })}
            <button
              disabled={activePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed select-none transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Grounding chunks research references */}
      {sources && sources.length > 0 && (
        <div className="bg-slate-50/55 rounded-2xl border border-slate-100/50 p-4 space-y-2">
          <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase block">
            AI Search Grounding References
          </span>
          <div className="flex flex-wrap gap-2">
            {sources.map((src, sIdx) => (
              <a
                key={sIdx}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200/50 rounded-xl px-2.5 py-1 hover:text-slate-800 text-slate-500 font-medium text-[10px] transition cursor-pointer shadow-xs"
              >
                <span>{src.title}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
