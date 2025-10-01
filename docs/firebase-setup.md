# Firebase configuration for Canvas Designer

Follow these steps to secure Firestore access with a shared service password and allow the web app to save activities automatically.

## 1. Enable Email/Password authentication
1. Open the [Firebase console](https://console.firebase.google.com/).
2. Select the **tdt-sandbox** project (or the project you deploy to).
3. Go to **Build → Authentication → Sign-in method**.
4. Enable **Email/Password** sign-in and click **Save**.

## 2. Create the service account user
1. Still under **Authentication**, switch to the **Users** tab.
2. Click **Add user**.
3. Enter the following credentials:
   - **Email**: `canvasdesigner-service@tdt-sandbox.firebaseapp.com`
   - **Password**: `saltisasin`
4. Click **Add user** to create the hidden service account.

> Only the app needs this password. End users never see a login prompt because the app signs in silently with the stored credentials.

## 3. Deploy the Firestore rules
1. Install the Firebase CLI if you have not already: `npm install -g firebase-tools`.
2. Authenticate the CLI: `firebase login`.
3. In your local project directory, deploy the included rules file: `firebase deploy --only firestore:rules`.

The `firestore.rules` file restricts document writes in the `canvasDesignerActivities` collection to the service user email while keeping reads public. It also opens the `wordCloudResponses` collection for public read/write access so learners can add words to shared clouds without signing in. Adjust these rules if your deployment requires stricter controls.

## 4. Optional: rotate the shared password later
- Generate a strong password in the Firebase console and update the base64-encoded string in `assets/js/firebaseClient.js`.
- To encode a new password locally, run `node -e "console.log(Buffer.from('<new-password>', 'utf8').toString('base64'))"` and replace the encoded value in the code.
- After updating the code, redeploy the site so the new password takes effect.

### Runtime overrides

If your deployment uses different Firebase projects or Firestore collection names, set any of the following configuration hooks before loading the app or viewer:

- `window.CANVASDESIGNER_FIREBASE_CONFIG` – object containing Firebase web config keys (`apiKey`, `projectId`, etc.).
- `window.CANVASDESIGNER_FIREBASE_SERVICE_ACCOUNT` – object with the service `email` plus either `password` or `passwordBase64`.
- `window.CANVASDESIGNER_FIRESTORE_COLLECTIONS` – object with `activities` and `responses` collection names.

For scripted deployments, export the matching environment variables instead (`CANVASDESIGNER_FIREBASE_PROJECT_ID`, `CANVASDESIGNER_FIRESTORE_ACTIVITIES_COLLECTION`, and so on). The authoring app, hosted viewer, and word cloud embed all read from these hooks so they stay aligned with your Firestore rules.

## 5. Embedding in Canvas
1. In the app, build your activity and open the **Embed code** panel.
2. Click **Copy** to copy the generated snippet.
3. In Canvas, edit the page in **HTML Editor** mode (not the Rich Content Editor).
4. Paste the snippet and save. Canvas may show a blank editor preview, but the activity will render when the page is viewed.
5. If Canvas removes scripts on save, ensure you are using the full HTML editor or the "Insert → Embed" option. The snippet is self-contained and does not load external scripts.

