# HelpMe manual test checklist

Use two separate browsers or one normal and one incognito window. Start with a fresh demo database if you want to reproduce the screenshots exactly.

- [ ] Register a new Computer Science student. Required specialization cannot be skipped.
- [ ] Log out and log in again. The account and specialization persist.
- [ ] Choose **Offer Help**: select Algorithms → Recursion and a time slot. Save, refresh, check choices persist.
- [ ] Sign in as `adilet@demo.edu`. In **My Activity**, open the pending Recursion request.
- [ ] Sign in as `arman@demo.edu` in another browser. The Recursion request appears in **Help Requests** and **Accept request** works.
- [ ] Show that Arman's Sorting request has **Set up matching offer** instead of enabled acceptance.
- [ ] Sign in as `dina@demo.edu`. Computer Science requests are invisible in her feed.
- [ ] Verify the accepted Recursion request disappears from the public feed and appears under the helper's **I'm helping** tab.
- [ ] In Adilet's account, mark the accepted request complete and leave a star rating.
- [ ] Go to **Find Helpers** and verify the review count and helper profile.
- [ ] Create a direct invitation using **Find Helpers → View Profile → Request Help**; the chosen helper sees an **Invited you** label and can accept/decline.
- [ ] Cancel a pending request and check it is no longer visible in any feed.
- [ ] Try another specialization's `topic_id` using the API; the backend rejects it (HTTP 403).
- [ ] Resize the browser to phone width and open the navigation using the menu button.

To run the included API integration test: `npm test`. This uses a temporary database and tests unauthorized actions, specialization restrictions, a simultaneous accept race, a completed rating, and targeted invitations.
