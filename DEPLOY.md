# Deploy your portfolio with GitHub and Vercel

Prepared 20 October 2026. The project is static, requires no environment variables or database, and uses Node.js 24 only while building. Vercel does not need to run `server.mjs`.

## 1. Upload to your personal GitHub account

1. Extract `exports/portfolio-github.zip` into a new folder.
2. Sign in at https://github.com/new.
3. Name the repository `nayoung-portfolio` (or another name you prefer).
4. Select your personal account as owner. Private is fine; Vercel can deploy a private repository to a public website.
5. Leave the options for adding a README, license, and .gitignore unchecked; the project already supplies its own README and .gitignore.
6. Click **Create repository**.
7. Click **uploading an existing file** on the empty repository page.
8. Drag the extracted files and folders into the upload area. Upload the **contents**, not the ZIP itself or the enclosing folder. Preserve folders such as `assets`, `content`, and `scripts`.
9. Enter `Initial portfolio website` as the commit message and click **Commit changes**.
10. Confirm that `package.json`, `package-lock.json`, `index.html`, and `vercel.json` are visible at the repository's top level.

The prepared ZIP excludes old downloaded source pages, caches, and build output. Generated project pages are created during deployment. If using GitHub Desktop instead, work with the main project folder and its existing `.gitignore`; `dist` and `exports` do not need to be committed.

## 2. Import the repository into Vercel

1. Visit https://vercel.com/new and sign in with GitHub.
2. Use the **Hobby** plan for eligible personal, non-commercial use. Avoid choosing a Pro trial if you want the free plan.
3. Authorize Vercel to access the `nayoung-portfolio` repository when prompted.
4. Under **Import Git Repository**, find that repository and click **Import**. If it is missing, use the GitHub account/permissions control to grant access to that repository.
5. Confirm these settings. The checked-in `vercel.json` supplies the build settings automatically:

| Setting | Value |
| --- | --- |
| Framework preset | Other |
| Root directory | Repository root (`./`) |
| Install command | `npm ci` |
| Build command | `npm run check` |
| Output directory | `dist` |
| Node.js version | 24.x |
| Environment variables | None |

6. Click **Deploy**.
7. Wait for the deployment to show **Ready**, then open its production `.vercel.app` address. A purchased domain is optional.

## 3. Check the published website

- Open the production URL in a private/incognito browser window, without a Vercel login.
- Switch between English and Korean.
- Open featured projects and the five additional projects.
- Open Bone To Gather's publisher presentation and the full Darkest Dungeon analysis.
- Refresh a project page directly to check that deep links work.
- Check images, video playback, contact links, and a narrow mobile viewport.

Screenshots and diagrams retain the text in the original artwork. YouTube videos require an internet connection. Notion is not required for viewing any project details.

## 4. Publish future updates

Edit the source in the main project folder. Run `npm run check`, then commit and push the changes to the repository's production branch (normally `main`). Vercel will build and deploy the update automatically. If you used browser upload, you can also upload changed files to the same repository, preserving their folder paths.

Do not edit only the generated `projects/*.html` files: the build recreates them from `content/` and `scripts/generate-projects.mjs`. A failed build or test does not replace the currently successful production deployment.

## Troubleshooting

- **Cannot find package.json:** the files were uploaded inside an extra folder. Move them to the repository root, or set Vercel's Root Directory to that folder.
- **Missing content or script:** ensure `content/`, `assets/`, and `scripts/generate-projects.mjs` were uploaded.
- **Build fails:** inspect the first error in Vercel's build log. Run `npm ci` and `npm run check` locally to reproduce it.
- **Old site after editing:** commit the changes to GitHub; editing local files alone does not trigger a deployment.
- **Visitors see a login screen:** use the production domain, not a preview link. Review Deployment Protection settings if the production domain is also restricted.

Official documentation:
- https://vercel.com/docs/git/vercel-for-github
- https://vercel.com/docs/builds/configure-a-build
- https://vercel.com/docs/plans/hobby
