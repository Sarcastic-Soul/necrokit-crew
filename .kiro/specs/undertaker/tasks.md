# Undertaker tasks

- [x] 1. Vendor the NecroKit build and wrap it in `src/scanner.ts` with input checks (R1.3, R1.4, R2.4, R2.5)
- [x] 2. JSON store with lock, atomic writes, scan trimming and one-time seeding (R1.1, R3.1, R3.2, R3.4)
- [x] 3. Schedule helpers `isDue` and `nextRunAt` (R2.1)
- [x] 4. `runWatch` and `runDueWatches`, with failed scans recorded instead of thrown (R2.1, R2.2, R2.6)
- [x] 5. Plan creation with NecroKit order and no repeat for unchanged findings (R5.1, R5.2, R5.3)
- [x] 6. Approve, dismiss and Markdown export (R5.4, R6.1, R6.2, R6.3)
- [x] 7. HTTP handler with all routes and input errors (R1.2 to R1.7, R2.2, R2.3, R3.3)
- [x] 8. Proxy signature v2 check and unsigned `/health` (R7.2, R7.3)
- [x] 9. node:http server and cron entry, bundled with esbuild (R2.1, R7.4, R8.2)
- [x] 10. React page: stats, watches table with trend, findings with severity filter and evidence, plans, add watch, export (R3.3, R4.1, R4.2, R4.3, R5.4, R6.1)
- [x] 11. Handle unscored reports in the backend, digest and UI (R4.4, R5.3)
- [x] 12. `app.json`, agent, `necrokit-triage` skill, hourly command cron and paused weekly digest (R7.1, R7.5)
- [x] 13. Text dashboard CLI (R8.3)
- [x] 14. Tests for every module above (all)
- [ ] 15. Install into a real Kiro Crew gateway and confirm the page, the backend proxy and both crons work (R7.1 to R7.5)
- [ ] 16. Screenshots from the installed app for the Devpost write-up
