# Mobile & Auth Setup Guide 📱

To make your app work perfectly on **both Desktop and Mobile**, you must follow these exact steps. This setup uses a "Magic DNS" trick (`nip.io`) to satisfy Google's security requirements while allowing mobile access.

## 1. Update Google Cloud Console (CRITICAL) ⚠️
Google blocks `localhost` on mobile and private IPs. You must tell it to trust our magic domain.

1.  Go to **[Google Cloud Console](https://console.cloud.google.com/apis/credentials)**.
2.  Select your project and click on your **OAuth 2.0 Client ID**.
3.  Look for **"Authorized redirect URIs"**.
4.  **Add this EXACT URL**:
    ```
    http://10.175.160.149.nip.io:3000/api/auth/callback/google
    ```
5.  Click **Save**.

## 2. Accessing the App 🌐

You must now use this specific URL for **EVERYTHING** (Desktop AND Mobile). Do not use `localhost`.

**URL**: `http://10.175.160.149.nip.io:3000`

### Why?
- **On Desktop**: It routes to your local machine just like localhost.
- **On Mobile**: It routes to your computer over Wi-Fi.
- **For Google**: It looks like a real public domain, so login works!

## 3. Troubleshooting
- **Login Loop?** If you are redirected back to login, ensure you are using the full `.nip.io` URL, not the IP address or localhost.
- **"Access Blocked"?** You didn't add the URL to Google Cloud Console correctly. Check for typos.
