import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query as fsQuery,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  db,
  auth,
  initAuth,
  googleSignIn,
  logout,
  OperationType,
  handleFirestoreError,
} from "./firebase";
import { PersonRecord, SearchCriteria, SearchSource, ExportHistoryItem } from "./types";
import SearchForm from "./components/SearchForm";
import ResultsTable from "./components/ResultsTable";
import { createAndPopulateGoogleSheet } from "./sheets";
import {
  FileSpreadsheet,
  History,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Search,
  ExternalLink,
  Info
} from "lucide-react";

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Search state
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [currentCriteria, setCurrentCriteria] = useState<SearchCriteria | null>(null);
  const [searchResults, setSearchResults] = useState<PersonRecord[]>([]);
  const [searchSources, setSearchSources] = useState<SearchSource[]>([]);
  const [isCachedResult, setIsCachedResult] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportedSheetUrl, setExportedSheetUrl] = useState<string | null>(null);
  const [exportLogs, setExportLogs] = useState<ExportHistoryItem[]>([]);

  // Initialization: check authentication
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, retrievedToken) => {
        setCurrentUser(user);
        setAccessToken(retrievedToken);
        setIsAuthLoading(false);
        // Load export logs when user is authentic
        loadExportLogs(user.uid);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setIsAuthLoading(false);
        setExportLogs([]);
      }
    );
    return () => unsubscribe();
  }, []);

  // Login handler
  const handleLogin = async () => {
    try {
      setErrorMessage(null);
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setAccessToken(result.accessToken);
        loadExportLogs(result.user.uid);
      }
    } catch (err: any) {
      console.error("Sign-In failed:", err);
      let errMsg = "Authentication failed.";
      
      // Handle Firebase unauthorized domain error specifically
      if (err.code === "auth/unauthorized-domain") {
        errMsg = "Domain Authorized Issue: Your current deployment domain is not added to your Firebase project. Please go to Firebase Console > Authentication > Settings > Authorized Domains and add your Netlify domain (e.g., your-subdomain.netlify.app) to the list.";
      } else if (err.code === "auth/popup-blocked") {
        errMsg = "Popup Blocked: The Google Authenticator window was blocked by your browser. Please allow popups for this site and search again.";
      } else if (err.code === "auth/popup-closed-by-user") {
        errMsg = "Popup Closed: The Google Sign-In popup was closed before completion. Please retry.";
      } else {
        errMsg = `Authentication error (${err.code || "unknown"}): ${err.message || String(err)}. Please verify OAuth settings.`;
      }
      
      setErrorMessage(errMsg);
    }
  };

  // Sign out handler
  const handleLogout = async () => {
    try {
      await logout();
      setCurrentUser(null);
      setAccessToken(null);
      setExportLogs([]);
      setExportedSheetUrl(null);
    } catch (err) {
      console.error("Log out failed:", err);
    }
  };

  // Extract export logs for audit history
  const loadExportLogs = async (userId: string) => {
    const colPath = "export_history";
    try {
      const q = fsQuery(
        collection(db, colPath),
        where("userId", "==", userId),
        orderBy("exportedAt", "desc"),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const logs: ExportHistoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        logs.push({
          userId: item.userId,
          userEmail: item.userEmail,
          spreadsheetId: item.spreadsheetId,
          spreadsheetUrl: item.spreadsheetUrl,
          queryType: item.queryType,
          queryText: item.queryText,
          exportedCount: item.exportedCount,
          exportedAt: item.exportedAt?.seconds
            ? new Date(item.exportedAt.seconds * 1000).toLocaleString()
            : String(item.exportedAt),
        });
      });
      setExportLogs(logs);
    } catch (err) {
      console.warn("Could not retrieve audit trial logs:", err);
    }
  };

  // Normalizer ID for Firestore searches
  const getCacheDocId = (criteria: SearchCriteria) => {
    const rawId = [criteria.type, criteria.query, criteria.location]
      .map((s) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "_"))
      .filter(Boolean)
      .join("_");
    return rawId.slice(0, 120);
  };

  // Perform search criteria query
  const handleSearch = async (criteria: SearchCriteria) => {
    setIsSearchLoading(true);
    setHasSearched(true);
    setCurrentCriteria(criteria);
    setSearchResults([]);
    setSearchSources([]);
    setIsCachedResult(false);
    setErrorMessage(null);
    setExportedSheetUrl(null);

    const docId = getCacheDocId(criteria);
    const cacheRef = doc(db, "search_cache", docId);

    // 1. Check local firestore cache first to bypass duplicate LLM operations
    try {
      const cachedDoc = await getDoc(cacheRef);
      if (cachedDoc.exists()) {
        const cacheData = cachedDoc.data();
        setSearchResults(cacheData.results || []);
        setIsCachedResult(true);
        setSearchSources([
          {
            title: "Archived Local Record Registry",
            url: "#",
          },
        ]);
        setIsSearchLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Cache check skipped/failed: ", err);
    }

    // 2. Cache miss, call Express API endpoint
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(criteria),
      });

      if (!response.ok) {
        const errObj = await response.json().catch(() => ({}));
        throw new Error(errObj.error || `Internal request failed: ${response.statusText}`);
      }

      const bodyData = await response.json();
      const results: PersonRecord[] = bodyData.results || [];
      const sources: SearchSource[] = bodyData.sources || [];

      setSearchResults(results);
      setSearchSources(sources);
      setIsCachedResult(false);

      // 3. Write search to Firestore Cache so others can leverage it
      if (currentUser && currentUser.emailVerified && results.length > 0) {
        try {
          await setDoc(cacheRef, {
            type: criteria.type,
            query: criteria.query,
            location: criteria.location || "",
            results,
            createdAt: serverTimestamp(),
          });
          setIsCachedResult(true);
        } catch (dbErr) {
          console.error("Failed to commit database cache item:", dbErr);
        }
      }
    } catch (error: any) {
      console.error("Lookup Failure Mode:", error);
      setErrorMessage(error.message || "Directory search aborted due to server interruption.");
    } finally {
      setIsSearchLoading(false);
    }
  };

  // Google Sheets Export
  const handleExportToSheets = async () => {
    if (!accessToken || searchResults.length === 0 || !currentCriteria) {
      setErrorMessage("Authentication is required to trigger Google Sheets exports.");
      return;
    }

    const title = `${currentCriteria.type.toUpperCase()} - ${currentCriteria.query}`;
    const confirmed = window.confirm(
      `Do you want to create a new spreadsheet and export the ${searchResults.length} directory records associated with '${title}'?`
    );
    if (!confirmed) return;

    setIsExporting(true);
    setErrorMessage(null);

    try {
      const resultObj = await createAndPopulateGoogleSheet(accessToken, title, searchResults);
      setExportedSheetUrl(resultObj.spreadsheetUrl);

      // Save history log inside Firestore
      if (currentUser) {
        const logId = `export_${Date.now()}`;
        const logRef = doc(db, "export_history", logId);
        try {
          await setDoc(logRef, {
            userId: currentUser.uid,
            userEmail: currentUser.email || "",
            spreadsheetId: resultObj.spreadsheetId,
            spreadsheetUrl: resultObj.spreadsheetUrl,
            queryType: currentCriteria.type,
            queryText: currentCriteria.query,
            exportedCount: searchResults.length,
            exportedAt: serverTimestamp(),
          });
          // Reload local history list
          await loadExportLogs(currentUser.uid);
        } catch (dbErr) {
          console.error("Failed storing audit trail:", dbErr);
        }
      }
    } catch (err: any) {
      console.error("Sheets export error:", err);
      setErrorMessage(err.message || "Spreadsheet generation halted. Please try signing in again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-800">
      {/* Dynamic top brand bar */}
      <header className="border-b border-slate-100 bg-white shadow-xs sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-slate-900 text-white rounded-xl">
              <Search className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                TruePeopleSearch Explorer
              </h1>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded-full border border-slate-200">
                v1.1 Grounded AI
              </span>
            </div>
          </div>

          {/* Authentication Area */}
          <div>
            {isAuthLoading ? (
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
            ) : currentUser ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-xs font-semibold text-slate-800">{currentUser.displayName}</span>
                  <span className="text-[10px] text-slate-400 truncate max-w-xs">{currentUser.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-slate-100 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="inline-flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 font-medium px-4 py-2 text-xs rounded-xl transition cursor-pointer shadow-sm shadow-slate-950/10"
              >
                <span>Sign in with Google</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Form & History (Spans 1 Column on Desktop) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase">Search Criteria</h2>
            <SearchForm onSearch={handleSearch} isLoading={isSearchLoading} />
          </div>

          {/* Search History Side Panel */}
          {currentUser && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-slate-400 tracking-wider uppercase flex items-center justify-between">
                <span>Recent Exports</span>
                <History className="w-3.5 h-3.5 text-slate-400" />
              </h2>
              <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3.5 shadow-xs">
                {exportLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No spreadsheet exports logged yet. Complete a search to begin.
                  </p>
                ) : (
                  <div className="space-y-3 divide-y divide-slate-100/50">
                    {exportLogs.map((log, index) => (
                      <div key={index} className="pt-3 first:pt-0 group">
                        <div className="flex items-center justify-between gap-2.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {log.queryType}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {log.exportedCount} rows
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 mt-1 truncate max-w-[200px]">
                          {log.queryText}
                        </p>
                        <a
                          href={log.spreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-teal-600 hover:text-teal-700 font-semibold text-[10px] mt-1 cursor-pointer"
                        >
                          <span>Open Sheet</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info Side card */}
          <div className="bg-slate-900 border border-slate-950 text-slate-300 rounded-2xl p-4 space-y-2.5 shadow-sm shadow-slate-900/10">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Airtight Directory Finder</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
              This system executes directory lookup sessions using live search grounding. All search results are persistently cached into Firestore, limiting repeating search lookups and system overhead.
            </p>
          </div>
        </div>

        {/* Right Column: Search Results Presentation (Spans 3 Columns on Desktop) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Error Message banner */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 text-xs text-rose-800">
              <Info className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <div className="space-y-1">
                <span className="font-bold">An unexpected occurrence happened:</span>
                <p className="text-rose-700/80 leading-normal">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Main Workspace Frame */}
          {!hasSearched ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[420px]">
              <span className="p-3 bg-slate-50 text-slate-400 rounded-2xl mb-4 border border-slate-100">
                <Search className="w-8 h-8" />
              </span>
              <h3 className="text-base font-bold text-slate-800">Begin Directory Search Session</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed font-normal">
                Input a combination of Full Name, 10-digit Phone connection, or Domicile address on the panel to cross-reference search grounding results.
              </p>
              {!currentUser && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <button
                    onClick={handleLogin}
                    className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold px-4 py-2 rounded-xl border border-slate-950 shadow-xs cursor-pointer"
                  >
                    <span>Sign in with Google First</span>
                  </button>
                  <p className="text-[10px] text-slate-400 max-w-xs leading-normal">
                    Sign in to enable community-wide search caching and activate exports to Google Sheets.
                  </p>
                </div>
              )}
            </div>
          ) : isSearchLoading ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[420px] space-y-4">
              <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-800 rounded-full animate-spin"></div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-800">Querying live registries...</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Consulting Whitepages indexes, directories, public census nodes, and TruePeopleSearch listings with active search grounding. Please wait...
                </p>
              </div>
            </div>
          ) : (
            <ResultsTable
              results={searchResults}
              sources={searchSources}
              isCached={isCachedResult}
              onExport={handleExportToSheets}
              isExporting={isExporting}
              exportedSheetUrl={exportedSheetUrl}
              isSignedIn={!!currentUser}
            />
          )}
        </div>
      </main>

      {/* Humble brand footer */}
      <footer className="border-t border-slate-100/80 bg-white py-6 mt-12 text-center">
        <p className="text-[11px] text-slate-400 font-normal">
          Humbly built with Google AI Studio • Designed with pure visual negative space and sans typography.
        </p>
      </footer>
    </div>
  );
}
