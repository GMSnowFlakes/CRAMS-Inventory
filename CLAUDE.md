# CRAMS Marketplace — Claude Instructions

## Release Automation

After ANY code change is completed and confirmed working, automatically run the release script. Do not ask for permission — just do it.

### How to release

```powershell
cd "C:\Users\marcp\Downloads\CRAMS-Marketplace"
.\release.ps1 -Version "X.X.X" -Notes "Brief description of what changed"
```

### Version numbering rules

- Bug fix or small tweak → bump patch: `1.0.0` → `1.0.1`
- New feature or improvement → bump minor: `1.0.0` → `1.1.0`
- Breaking change or major rewrite → bump major: `1.0.0` → `2.0.0`

Read `config/version.php` to get the current version before deciding what to bump to.

### Release notes format

Write the `-Notes` value as a short plain-English summary of what changed. Example:

```
"Fixed stock forecasting calculation for branches with zero sales history"
"Added export to CSV on the Reports page"
"Improved POS performance on low-end devices"
```

### What the script does automatically

1. Bumps `config/version.php` to the new version
2. Builds the frontend (`npm run build`)
3. Commits all changes
4. Pushes to GitHub
5. Creates a GitHub release — all installed CRAMS instances see the update

### Do not release if

- The build fails
- Migrations are incomplete
- The user explicitly says "don't release yet"

## Project context

- Repo: `GMSnowFlakes/CRAMS-Inventory` on GitHub
- Stack: Laravel 13 + React 18 + MySQL
- Sold on micron.io as a self-hosted inventory management system
- Buyers update via the **System Updates** page inside the admin panel (`/updates`)
