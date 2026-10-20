"""Create a clean GitHub-upload ZIP without caches or generated build output."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
out = root / "exports"
out.mkdir(exist_ok=True)
files = [
    ".gitignore", "package.json", "package-lock.json", "vercel.json",
    "index.html", "style.css", "app.js", "language.js", "project.css", "project.js",
    "build.mjs", "server.mjs", "project.test.mjs", "language.test.mjs",
    "README.md", "DEPLOY.md", "scripts/generate-projects.mjs",
]
files += [p.relative_to(root).as_posix() for p in (root / "assets").rglob("*") if p.is_file()]
files += [p.relative_to(root).as_posix() for p in (root / "content").glob("*.json")]
files += ["content/translations.tsv"]
archive = out / "portfolio-github.zip"
with ZipFile(archive, "w", ZIP_DEFLATED) as z:
    for name in sorted(set(files)):
        z.write(root / name, name)
with ZipFile(archive) as z:
    assert z.testzip() is None
    print(f"Created {archive}: {len(z.namelist())} files, {archive.stat().st_size / 1024 / 1024:.1f} MB")
    # Verify a deployment from only the files that will be uploaded.
    destination = out / "upload-verification"
    destination.mkdir(exist_ok=True)
    z.extractall(destination)
