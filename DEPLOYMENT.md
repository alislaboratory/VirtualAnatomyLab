# cPanel Deployment Guide

This guide will help you deploy the Virtual Anatomy Lab application to your cPanel hosting.

> **💡 Using Git?** See **[GIT_DEPLOYMENT.md](GIT_DEPLOYMENT.md)** for Git-based deployment instructions.

## Quick Start (TL;DR)

1. Upload all files to `public_html/anatomy-lab` (via File Manager or FTP)
2. In cPanel, go to **Node.js Selector** → **Create Application**
3. Set:
   - **Application Root**: `/home/username/public_html/anatomy-lab`
   - **Application Startup File**: `server.js`
   - **Node.js Version**: 18.x or 20.x
4. Open Terminal in cPanel and run: `cd ~/public_html/anatomy-lab && npm install`
5. Click **Restart App** in Node.js Selector
6. Visit your application URL

## Prerequisites

- cPanel hosting with Node.js support enabled
- Access to cPanel File Manager and Terminal (or SSH access)
- Your domain name

## Step-by-Step Deployment

### 1. Prepare Your Files

1. **Upload all files** to your cPanel account:
   - Upload the entire project folder to your cPanel's `public_html` directory (or a subdirectory like `public_html/anatomy-lab`)
   - Make sure to upload:
     - `server.js`
     - `package.json`
     - `index.html`
     - `viewer.js`
     - `style.css`
     - `README.md`
     - `models/` directory (if it contains files)
   - **Do NOT upload** `node_modules/` - this will be installed on the server

### 2. Access cPanel Node.js Selector

1. Log into your cPanel
2. Find and click on **"Node.js Selector"** or **"Setup Node.js App"**
3. If you don't see this option, contact your hosting provider to enable Node.js support

### 3. Create a Node.js Application

1. Click **"Create Application"** or **"Add Application"**
2. Fill in the following details:
   - **Node.js Version**: Select the latest LTS version (18.x or 20.x recommended)
   - **Application Mode**: Production
   - **Application Root**: `/home/username/public_html/anatomy-lab` (or your chosen directory)
   - **Application URL**: Choose your domain/subdomain (e.g., `anatomy-lab.yourdomain.com` or `yourdomain.com/anatomy-lab`)
   - **Application Startup File**: `server.js`
   - **Load App URL**: Check this box

3. Click **"Create"**

**⚠️ Troubleshooting "No package.json" Error:**

If you see "no package.json is available" when creating the application:
1. **Check Application Root path** - It must be the exact directory containing `package.json`
   - Use **File Manager** in cPanel to navigate to your directory
   - Right-click the folder → **Copy Path** to get the exact path
   - Make sure the Application Root matches this path exactly
2. **Verify package.json exists** in that directory:
   - Open **File Manager** in cPanel
   - Navigate to your application directory
   - Confirm `package.json` is visible in the file list
3. **Check file permissions**:
   - Right-click `package.json` → **Change Permissions**
   - Set to `644` (readable by all, writable by owner)
4. **Re-upload package.json** if it's missing:
   - Download `package.json` from your local project
   - Upload it via File Manager to your application directory
5. **Double-check the path** - Common mistakes:
   - ❌ `/home/username/public_html/anatomy-lab/` (trailing slash)
   - ✅ `/home/username/public_html/anatomy-lab` (no trailing slash)
   - ❌ `/home/username/public_html/anatomy-lab/subfolder` (wrong subdirectory)
   - ✅ `/home/username/public_html/anatomy-lab` (correct root)

### 4. Install Dependencies

After creating the application, you'll see options to manage it. You need to install dependencies:

**Option A: Using cPanel Terminal**
1. Open **Terminal** in cPanel
2. Navigate to your application directory:
   ```bash
   cd ~/public_html/anatomy-lab
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

**Option B: Using SSH (if available)**
1. Connect via SSH to your server
2. Navigate to your application directory
3. Run `npm install`

### 5. Configure the Port

cPanel Node.js apps typically use an environment variable for the port. Update your `server.js` to work with cPanel:

The current code already uses `process.env.PORT || 3000`, which should work. However, cPanel may provide the port via `process.env.PORT`.

### 6. Set Environment Variables (if needed)

In the Node.js Selector, you can set environment variables:
- `PORT`: Usually set automatically by cPanel
- `NODE_ENV`: Set to `production`

### 7. Fix "better-sqlite3" Installation Errors

**If you get errors about `better-sqlite3` failing to compile:**

This happens because `better-sqlite3` requires native compilation, and some cPanel servers have older system libraries. Try these solutions in order:

**Solution 1: Try a Different Node.js Version**

1. In **Node.js Selector**, click **"Edit"** on your application
2. Change **Node.js Version** to:
   - **Node.js 16.x** (often has better prebuilt binaries)
   - Or **Node.js 20.x** (newer, may have prebuilt binaries)
3. **Save** the changes
4. In Terminal, try installing again:
   ```bash
   npm install
   ```

**Solution 2: Force Prebuilt Binary Installation**

Try to force npm to use prebuilt binaries instead of compiling:

```bash
npm install --build-from-source=false better-sqlite3
npm install
```

**Solution 3: Install Build Tools (If Available)**

Some cPanel hosts allow installing build tools. Contact your hosting provider to:
- Enable Python 3.8+ (for node-gyp)
- Install build-essential or development tools
- Update GLIBC (if possible)

**Solution 4: Use File-Based JSON Database ✅ DONE**

The application has been updated to use a lightweight file-based JSON database instead of `better-sqlite3` or `sql.js`. This solution:
- ✅ **No native compilation** required
- ✅ **No WebAssembly** (no memory issues)
- ✅ **No external dependencies** (uses only built-in Node.js `fs` module)
- ✅ **Works on all cPanel hosting** environments

**The code has already been updated** - just install dependencies normally:
```bash
npm install
```

**Note:** The database file is now `anatomy_lab.json` instead of `anatomy_lab.db`. If you have an existing SQLite database, you'll need to export and migrate the data (or start fresh).

### 8. Start/Restart the Application

1. In the Node.js Selector, find your application
2. Click **"Restart App"** or **"Start App"**
3. Wait for the application to start (check the status)

### 8. Fix "Files Not Found" Issue

**If you see only boilerplate files when opening Terminal:**

This means the Node.js app was created, but your application files aren't in the Application Root directory. Here's how to fix it:

**Option A: Upload Files to the Application Directory**

1. **Note the Application Root path** from Node.js Selector (e.g., `/home/ashrfgia/home/ashrfgia/anat.ashrafy.au/VirtualAnatomyLab`)
2. **Open File Manager** in cPanel
3. **Navigate to that exact directory** (use the path from step 1)
4. **Upload all your application files** to that directory:
   - `package.json`
   - `server.js`
   - `index.html`
   - `viewer.js`
   - `style.css`
   - Any other project files
5. **Create the `models/` directory** in that location (for uploaded GLB files)
6. **Go back to Terminal** and verify files are there:
   ```bash
   ls -la
   ```
7. **Install dependencies**:
   ```bash
   npm install
   ```
8. **Restart the app** in Node.js Selector

**Option B: Change Application Root to Where Files Are**

If your files are already uploaded somewhere else:

1. **Find where your files are** using File Manager
2. **Note the exact path** (right-click folder → Copy Path)
3. **Go to Node.js Selector** → Click **"Edit"** on your application
4. **Change Application Root** to the path where your files actually are
5. **Save** and restart the app

**Option C: Use Git to Clone Files**

If you're using Git:

1. **In Terminal**, navigate to the Application Root directory:
   ```bash
   cd /home/ashrfgia/home/ashrfgia/anat.ashrafy.au/VirtualAnatomyLab
   ```
2. **Clone your repository**:
   ```bash
   git clone https://github.com/yourusername/virtual-anatomy-lab.git .
   ```
   (The `.` at the end clones into the current directory)
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Restart the app** in Node.js Selector

### 9. Access Your Application

1. Visit your application URL (the one you set in step 3)
2. You should see the login screen
3. Log in with one of the credentials:
   - Username: `christina`, `kosta`, `ali`, or `patrick`
   - Password: `brachialplexus`

## Troubleshooting

### 503 Service Unavailable Error

If you see a **503 Service Unavailable** error when accessing your application, follow these steps:

**Step 1: Check if the App is Running**

1. Go to **Node.js Selector** in cPanel
2. Find your application in the list
3. Check the **Status** - it should show "Running" (green)
4. If it shows "Stopped" or "Error":
   - Click **"Start App"** or **"Restart App"**
   - Wait 10-15 seconds for it to start
   - Refresh your browser

**Step 2: Check Application Logs**

**Where to Find Logs in cPanel:**

The location varies by cPanel version. Try these locations:

**Option A: Node.js Selector Interface**
1. In **Node.js Selector**, find your application in the list
2. Look for one of these buttons/links next to your app:
   - **"Logs"** button
   - **"View Logs"** button
   - **"Error Log"** link
   - **"Output"** or **"Output Log"** link
   - A **dropdown arrow** or **"..."** menu → select "View Logs"
3. Click it to see the application output

**Option B: cPanel Error Log**
1. In cPanel main menu, search for **"Error Log"** or **"Errors"**
2. Click on it
3. Look for entries related to your Node.js app or domain

**Option C: Terminal/SSH**
1. Open **Terminal** in cPanel
2. Navigate to your Application Root directory
3. Check if there's a log file:
   ```bash
   ls -la *.log
   ```
4. Or check the Node.js app's output directly:
   ```bash
   cd /home/ashrfgia/home/ashrfgia/anat.ashrafy.au/VirtualAnatomyLab
   node server.js
   ```
   (This will show errors in real-time - press Ctrl+C to stop)

**Option D: Application Manager**
1. Some cPanel versions have **"Application Manager"** instead of Node.js Selector
2. Find your app → Click **"Manage"** → Look for **"Logs"** tab

**What to Look For in Logs:**
- **"Cannot find module"** → Dependencies not installed (run `npm install`)
- **"EADDRINUSE"** → Port conflict (contact hosting provider)
- **"ENOENT"** → Missing file (check Application Root path)
- **Database errors** → Check file permissions on `anatomy_lab.db`
- **"SyntaxError"** → Code issue in server.js
- **"ECONNREFUSED"** → Database connection issue

**Step 3: Verify Application Root Path**

1. In **Node.js Selector**, click **"Edit"** on your application
2. Check the **Application Root** path
3. Open **File Manager** and verify:
   - The path exists
   - `server.js` is in that directory
   - `package.json` is in that directory
4. If wrong, update the path and **Save**

**Step 4: Reinstall Dependencies**

1. Open **Terminal** in cPanel
2. Navigate to your Application Root:
   ```bash
   cd /home/username/path/to/your/app
   ```
3. Remove `node_modules` and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```
4. Go back to **Node.js Selector** and **Restart App**

**Step 5: Check File Permissions**

1. In **File Manager**, navigate to your Application Root
2. Right-click `anatomy_lab.db` → **Change Permissions**
3. Set to `644` (readable/writable by owner, readable by others)
4. If the file doesn't exist, the app will create it automatically

**Step 6: Verify Port Configuration**

1. In **Node.js Selector**, check your application settings
2. The **Port** should be set automatically by cPanel
3. Make sure `server.js` uses `process.env.PORT` (it does by default)
4. If you see port errors in logs, contact your hosting provider

**Step 7: Test Database Initialization**

1. In **Terminal**, try running the server manually:
   ```bash
   cd /home/username/path/to/your/app
   node server.js
   ```
2. If it starts without errors, press `Ctrl+C` to stop
3. If you see errors, fix them before restarting in Node.js Selector

**Step 8: Check Node.js Version**

1. In **Node.js Selector**, verify you're using **Node.js 16.x, 18.x, or 20.x**
2. Try switching to a different version if current one has issues
3. **Save** and **Restart App**

**Still Not Working?**

- Contact your hosting provider with:
  - Error messages from logs
  - Application Root path
  - Node.js version you're using
  - Steps you've already tried

### Other Common Issues

### Application Won't Start

1. **Check Logs**: In Node.js Selector, click "View Logs" to see error messages
2. **Check Port**: Ensure `process.env.PORT` is being used (cPanel sets this automatically)
3. **Check Dependencies**: Make sure `npm install` completed successfully
4. **Check File Permissions**: Ensure the `models/` directory is writable (chmod 755)

### Database Issues

1. The SQLite database (`anatomy_lab.db`) will be created automatically
2. Ensure the directory has write permissions for the database file
3. If issues persist, check file permissions on the application directory

### Database Installation Issues

The application now uses `sql.js` (pure JavaScript, no compilation needed). If `npm install` fails:

1. **Check Node.js version**: Use Node.js 16.x, 18.x, or 20.x
2. **Clear npm cache**: `npm cache clean --force`
3. **Reinstall**: `rm -rf node_modules package-lock.json && npm install`
4. If issues persist, check the application logs for specific error messages

### Static Files Not Loading

1. Ensure `index.html`, `viewer.js`, and `style.css` are in the correct location
2. Check that the server is serving static files correctly (the current `server.js` should handle this)

### Port Already in Use

1. cPanel manages ports automatically - you shouldn't need to set a specific port
2. If you see port errors, contact your hosting provider

## File Structure on cPanel

Your directory structure should look like:
```
public_html/
└── anatomy-lab/          (or your chosen directory)
    ├── server.js
    ├── package.json
    ├── index.html
    ├── viewer.js
    ├── style.css
    ├── models/          (will be created if it doesn't exist)
    ├── node_modules/    (created after npm install)
    └── anatomy_lab.db   (created automatically on first run)
```

## Important Notes

1. **Security**: The current login system is basic. For production, consider:
   - Using environment variables for credentials
   - Implementing proper password hashing
   - Adding HTTPS/SSL certificate

2. **Database**: SQLite is used, which is fine for small to medium deployments. For larger scale, consider PostgreSQL or MySQL.

3. **File Uploads**: The `models/` directory needs write permissions for file uploads to work.

4. **Updates**: When updating the application:
   - Upload new files via File Manager
   - Restart the application in Node.js Selector
   - If you add new dependencies, run `npm install` again

## Alternative: Using a Subdomain

If you want to run this on a subdomain (e.g., `anatomy.yourdomain.com`):

1. Create the subdomain in cPanel
2. Point the subdomain to your application directory
3. Set the Application URL to the subdomain in Node.js Selector

## Support

If you encounter issues:
1. Check the application logs in Node.js Selector
2. Verify all files are uploaded correctly
3. Ensure Node.js version is compatible (18.x or 20.x)
4. Contact your hosting provider if Node.js Selector is not available

