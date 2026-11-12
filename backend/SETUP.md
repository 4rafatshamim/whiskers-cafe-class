# Backend setup (Google Sheets + Apps Script, about 10 minutes, free)

1. Create a blank Google Sheet (name it Whiskers Café Orders). Keep it private.
2. **Extensions → Apps Script**. Delete everything, paste all of `Code.gs`. Change `OWNER_EMAIL` at the top. Save.
3. Run **setup** (creates the Orders and Menu tabs). Allow permissions when Google asks (Advanced → Go to project → Allow).
4. Create the staff logins: inside the Apps Script editor only, replace the 3 `CHANGE-ME` passwords in `createStaffAccounts` with real ones (8+ characters) and run it. A Staff tab appears. Never put the real passwords on GitHub.
5. **Deploy → New deployment → Web app**. Execute as **Me**, access **Anyone**. Copy the Web app URL into `backendUrl` in `config.js`.
6. Test: place an order on the site (a row appears in Orders, you get an email), then log in on `staff.html` and mark an item sold out.

**Updated Code.gs later?** Deploy → Manage deployments → pencil → Version: New version → Deploy. The URL stays the same.
