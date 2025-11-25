# cPanel Deployment Guide

This guide will help you deploy the Virtual Anatomy Lab application to your cPanel hosting.

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

### 7. Start/Restart the Application

1. In the Node.js Selector, find your application
2. Click **"Restart App"** or **"Start App"**
3. Wait for the application to start (check the status)

### 8. Access Your Application

1. Visit your application URL (the one you set in step 3)
2. You should see the login screen
3. Log in with one of the credentials:
   - Username: `christina`, `kosta`, `ali`, or `patrick`
   - Password: `brachialplexus`

## Troubleshooting

### Application Won't Start

1. **Check Logs**: In Node.js Selector, click "View Logs" to see error messages
2. **Check Port**: Ensure `process.env.PORT` is being used (cPanel sets this automatically)
3. **Check Dependencies**: Make sure `npm install` completed successfully
4. **Check File Permissions**: Ensure the `models/` directory is writable (chmod 755)

### Database Issues

1. The SQLite database (`anatomy_lab.db`) will be created automatically
2. Ensure the directory has write permissions for the database file
3. If issues persist, check file permissions on the application directory

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

