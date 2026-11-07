# Tracker Send — manual test and release note

Date: 2026-11-07. Not deployed.

## What changed

On the Nitto Watermain tracker (https://nitto-watermain.pages.dev/, source `zpg-site-platform/public/index.html`):

- Status, priority, and new issues change only in this browser until you press **Send**.
- The tracker header shows **Unsaved changes on this page**, **Sending…**, **Saved**, or an error. The error leaves the edits on the page.
- **Refresh** loads the tracker once. Leaving the tab idle, or hiding it, does not keep asking the server for data.
- Send is one write per changed item. Pressing Send again while a send is in progress does not write a second copy. A new item keeps its `N-nn` id if the send fails, so a retry does not create another item.
- If someone else changed that item, Send does not overwrite their record. The message says so, and the unsent edit stays. Refresh still does not throw the edit away.
- Closing or reloading the page with unsent edits asks you to stay, and the edits are still there when you come back, until a send succeeds or you press **Discard unsaved**.

Records already in the database are not rewritten by this change. Review decisions, forum posts, validation requests, the “Send to Claude” box, and sign-in are unchanged.

## Multi-tab and multi-user

There is no live feed anymore. Another tab, or another person, does not appear until you press **Refresh** (or load the page). That is what stops the idle requests that were using up the Cloudflare free daily allowance.

Two tabs in the same browser share unsent edits. If both press Send on the same item, the first write wins. The second Send gets a conflict, leaves that edit on the page, and does not replace the saved record. Edits to different items from two tabs are both kept until each is sent.

Two people do not see each other’s unsent edits. After one person sends, the other sees it on their next load or Refresh. If they had already changed that same item, their Send is refused and their edit stays on their page.

## Manual test

1. Open the site from a personal invite link. Open **Tracker**, then **Flat list**.
2. Click a status. The row says **Unsaved** and the header says **Unsaved changes on this page**. Reload. The status you clicked is still the unsaved one, and the shared list (another browser, or this one after Discard) does not have it.
3. Press **Send**. The header says **Saved**. Reload. The new status is still there.
4. Turn the network off, click a status, press **Send**. The header shows an error and the row stays unsaved. Turn the network on and press **Send** once. It saves once.
5. Leave the tracker open and hidden for a minute. The browser’s network log should show no repeating `/api/c/` requests after the first load. **Refresh** may fetch again. **Send** fetches only for the save.

## Deploy

This is a source change only. Production is still the previous Pages deployment until someone deploys this branch. Do not deploy from this note. See the pull request for the exact uncertainty.
