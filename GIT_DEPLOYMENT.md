# Git Deployment Guide for cPanel

This guide explains how to deploy the Virtual Anatomy Lab to cPanel using Git version control.

## Prerequisites

- Git repository (GitHub, GitLab, Bitbucket, etc.)
- cPanel hosting with Git Version Control and Node.js support
- SSH access to your cPanel account (recommended)

## Method 1: Using cPanel Git Version Control (Recommended)

### Step 1: Push Your Code to a Git Repository

1. **Initialize Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create a repository** on GitHub, GitLab, or Bitbucket

3. **Add remote and push**:
   ```bash
   git remote add origin https://github.com/yourusername/virtual-anatomy-lab.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Clone Repository in cPanel

1. **Log into cPanel**
2. Find and click **"Git Version Control"** or **"Git™ Version Control"**
3. Click **"Create"** or **"Clone a Repository"**
4. Fill in:
   - **Repository URL**: Your Git repository URL (e.g., `https://github.com/yourusername/virtual-anatomy-lab.git`)
   - **Repository Path**: `/home/username/public_html/anatomy-lab` ⚠️ **Important: Clone directly to your web directory!**
   - **Repository Name**: `anatomy-lab`
   - **Branch**: `main` or `master` (depending on your default branch)
5. Click **"Create"**

**Why clone directly to public_html?**
- This way, your files are already in the web-accessible location
- You don't need to use the "Deploy" feature
- Simpler setup for Node.js applications

### Step 3: Set Up Deployment Directory (Optional)

**What does "Deploy" do?**
- When you clone a Git repository in cPanel, it typically goes to `/home/username/repositories/repo-name`
- The "Deploy" feature copies files from the repository to your web-accessible directory (like `public_html`)
- This keeps your Git repo separate from your web files

**Do you need it?**
- **Option A (Recommended)**: Clone directly to your web directory - Skip the deploy step
  - When cloning, set the repository path to: `/home/username/public_html/anatomy-lab`
  - This way, the files are already where they need to be
  - No deploy step needed!

- **Option B**: Use deploy feature
  - Clone to `/home/username/repositories/anatomy-lab` (default location)
  - Then set up Deploy to copy to `/home/username/public_html/anatomy-lab`
  - Useful if you want to keep Git repo separate from web files

**For this Node.js app, we recommend Option A** (clone directly to web directory) to keep things simple.

### Step 4: Verify Files Are Present

Before creating the Node.js app, verify your files are in place:

1. Open **File Manager** in cPanel
2. Navigate to `/public_html/anatomy-lab` (or your chosen directory)
3. **Verify these files exist**:
   - ✅ `package.json`
   - ✅ `server.js`
   - ✅ `index.html`
   - ✅ `viewer.js`
   - ✅ `style.css`

**If files are missing:**
- If using Git: Make sure you've committed `package.json` to your repository
- Check that the Git clone completed successfully
- If using Deploy: Make sure Deploy ran successfully

### Step 5: Set Up Node.js Application

1. Go to **Node.js Selector** in cPanel
2. Click **"Create Application"**
3. Configure:
   - **Application Root**: `/home/username/public_html/anatomy-lab` ⚠️ **Must match exactly where package.json is located!**
   - **Application Startup File**: `server.js`
   - **Node.js Version**: 18.x or 20.x
   - **Application URL**: Your domain/subdomain
4. Click **"Create"**

**⚠️ Troubleshooting "No package.json" Error:**

If you see "no package.json is available":
1. **Check Application Root path** - It must be the exact directory containing `package.json`
   - Use **File Manager** to find the exact path
   - Copy the full path from File Manager (right-click folder → Copy Path)
2. **Verify package.json exists** in that directory using File Manager
3. **Check file permissions** - `package.json` should be readable (644 permissions)
4. **If using Git**: Make sure `package.json` is committed to your repository:
   ```bash
   git add package.json
   git commit -m "Add package.json"
   git push
   ```
5. **Re-clone or re-deploy** if files are missing

### Step 6: Install Dependencies and Start

1. Open **Terminal** in cPanel
2. Navigate to your application:
   ```bash
   cd ~/public_html/anatomy-lab
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Go back to **Node.js Selector** and click **"Restart App"**

### Step 7: Set Up Auto-Deploy (Optional)

To automatically deploy when you push to Git:

1. In **Git Version Control**, click **"Manage"** on your repository
2. Enable **"Auto Deploy"** or set up a webhook:
   - For GitHub: Use GitHub webhooks pointing to your cPanel
   - For GitLab: Use GitLab CI/CD or webhooks
   - For Bitbucket: Use Bitbucket Pipelines or webhooks

## Method 2: Manual Git Deployment via SSH

If you have SSH access, you can deploy manually:

### Step 1: Clone Repository via SSH

```bash
ssh username@yourdomain.com
cd ~/public_html
git clone https://github.com/yourusername/virtual-anatomy-lab.git anatomy-lab
cd anatomy-lab
npm install
```

### Step 2: Set Up Node.js App

Follow the same steps as Method 1, Step 4, but point to the cloned directory.

### Step 3: Update Deployment

When you make changes:

```bash
ssh username@yourdomain.com
cd ~/public_html/anatomy-lab
git pull origin main
npm install  # Only if package.json changed
# Restart app in Node.js Selector
```

## Method 3: Using Git Hooks (Advanced)

You can set up a post-receive hook for automatic deployment:

1. **Create a bare repository** (optional, for more control):
   ```bash
   ssh username@yourdomain.com
   mkdir -p ~/repos/anatomy-lab.git
   cd ~/repos/anatomy-lab.git
   git init --bare
   ```

2. **Create post-receive hook**:
   ```bash
   cat > hooks/post-receive << 'EOF'
   #!/bin/bash
   cd ~/public_html/anatomy-lab
   git --git-dir=~/repos/anatomy-lab.git --work-tree=~/public_html/anatomy-lab checkout -f
   cd ~/public_html/anatomy-lab
   npm install --production
   # Restart Node.js app (you may need to use cPanel API or manual restart)
   EOF
   chmod +x hooks/post-receive
   ```

3. **Add remote to your local repo**:
   ```bash
   git remote add production username@yourdomain.com:~/repos/anatomy-lab.git
   git push production main
   ```

## Recommended .gitignore

Make sure your `.gitignore` includes:

```
node_modules/
anatomy_lab.db
models/*.glb
.env
.DS_Store
*.log
```

## Deployment Workflow

### Daily Development Workflow:

1. **Make changes locally**
2. **Commit changes**:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

3. **Deploy to cPanel**:
   - If using cPanel Git Version Control: Click **"Pull or Deploy"** in cPanel
   - If using SSH: `ssh username@domain.com "cd ~/public_html/anatomy-lab && git pull && npm install"`
   - Restart the app in Node.js Selector

### Automated Deployment (Recommended)

Set up GitHub Actions, GitLab CI/CD, or similar to automatically:
1. Pull latest code
2. Install dependencies
3. Restart the Node.js app

## Troubleshooting

### Git Clone Fails

- Check repository URL is correct
- Verify you have access (for private repos, use SSH keys or deploy tokens)
- Check cPanel Git Version Control is enabled

### Files Not Updating After Pull

- Make sure you're pulling in the correct directory
- Clear any caches
- Restart the Node.js application

### Permission Issues

- Ensure the deployment directory has correct permissions:
  ```bash
  chmod 755 ~/public_html/anatomy-lab
  chmod 644 ~/public_html/anatomy-lab/*
  ```

### Database Not Persisting

- The `anatomy_lab.db` file should be in `.gitignore`
- Make sure the directory has write permissions
- Database will be created automatically on first run

## Best Practices

1. **Never commit sensitive data**: Use environment variables for credentials
2. **Use branches**: Develop on `develop` branch, deploy `main` branch
3. **Tag releases**: Use Git tags for version tracking
4. **Backup database**: Regularly backup `anatomy_lab.db` before major updates
5. **Test locally first**: Always test changes locally before deploying

## Quick Reference Commands

```bash
# Initial setup
git init
git add .
git commit -m "Initial commit"
git remote add origin <repository-url>
git push -u origin main

# Regular updates
git add .
git commit -m "Update description"
git push origin main

# Deploy (via SSH)
ssh user@domain.com "cd ~/public_html/anatomy-lab && git pull && npm install"
```

## Next Steps

After setting up Git deployment:
1. Make your repository private (if it contains sensitive info)
2. Set up branch protection rules
3. Consider using GitHub Actions or similar for CI/CD
4. Set up automated backups of the database

