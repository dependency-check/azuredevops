# GitHub Actions Setup

## Required Secrets

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Description | Where to get it |
|--------|-------------|-----------------|
| `AZURE_DEVOPS_PAT` | Personal Access Token | [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage) → Create token with **Marketplace (Manage)** scope |
| `AZURE_DEVOPS_SHARE_WITH` | Orgs to share dev/hotfix builds | Comma-separated org names, e.g., `org1,org2` (optional) |

Extension metadata (publisher, ID, name) is read from `vss-extension.json`.

## Workflow Triggers

- **`feature/*` branches** → Build + Publish to Development (e.g., `feature/1.0.0`)
- **`hotfix/*` branches** → Build + Publish to Hotfix (e.g., `hotfix/1.0.1`)
- **Tags** → Build + Publish to Release + Create GitHub Release (e.g., `1.0.0`)
- **Pull requests** → Build + Test only

**Note:** Branch and tag names must contain a semver version number (e.g., `1.0.0`).

## Optional: Environment Protection

Add approval gates in **Settings → Environments**:
- Development
- Hotfix
- Release (recommended)
