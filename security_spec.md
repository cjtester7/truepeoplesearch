# Security Specification & "Dirty Dozen" Red Team Test Spec

## 1. Data Invariants
- **Search Cache (`search_cache/{cacheId}`)**:
  - Anyone (signed-in or not) can read the cached searches to minimize API costs and redundant LLM queries.
  - To prevent abuse/spam, only signed-in and email-verified users can create cached entries.
  - Creating a cache document requires a valid ID format (`isValidId(cacheId)`).
  - The payload must contain all required fields with restricted sizes (e.g., query size must be <= 500 characters, type must be one of 'name', 'phone', 'address', list sizes <= 100).
- **Export History (`export_history/{exportId}`)**:
  - Read access is strictly restricted to the owner of the logs (`resource.data.userId == request.auth.uid`). No other user can spy on another user's search exports.
  - Create access is strictly limited to authenticated, verified users writing their own logs (`incoming().userId == request.auth.uid`).
  - Modify and Delete operations are strictly forbidden (immutable audit trail).

## 2. The "Dirty Dozen" Malicious Payloads
Here are 12 malicious payloads designed to bypass schema rules, hijack identity, escalate privileges, or exhaust resources, all of which are rejected:

1. **Self-Appointed Writer**: Unauthenticated write to `search_cache` without authorization headers.
2. **Path Injection Poisoning**: Document ID containing 5KB of garbage trailing script tags (`search_cache/<script>alert(1)</script>`).
3. **Invalid Query Type**: Create cache item with `type: "superspy"`.
4. **Massive Payload Invariant**: Inject 1MB string into the query field to trigger Denial of Wallet.
5. **PII Hijacking**: Read search history from `export_history` of another user (`userId_victim`).
6. **Pre-Dated Cache**: Spoof `createdAt` set to a hardcoded client date instead of `request.time`.
7. **Bypass State Keys**: Inject an unrequested "adminMode: true" ghost field inside the cache document.
8. **Negative Export Record**: Log an audit trail entry with a negative count of rows (`exportedCount: -5`).
9. **Fake Email Ingestion**: Log an audit history with spoofed email ("temp@scam.org") that differs from verified Auth email.
10. **Tampering with Past History**: Attempt to overwrite an existing immutable `export_history` log with modified spreadsheet URLs.
11. **Malicious Empty Arrays**: Create `PersonRecord` inside cache with 10,000 blank phone strings.
12. **Zombie Deletion Attack**: Attempt to delete directory cache items to force the backend to re-run expensive LLM requests.

## 3. Fortress Firestore Rules (`firestore.rules`)
Below we map out the airtight `firestore.rules` file that compiles perfectly and addresses all 12 validation challenges. We enforce strict structure, data verification, size bounds, and temporal integrity.
