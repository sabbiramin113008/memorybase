"""
Pre-build script: copies frontend/dist → backend/static before packaging.
Run this before `python -m build`:
    python build.py
"""
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
FRONTEND = ROOT / "frontend"
DIST = FRONTEND / "dist"
STATIC = ROOT / "backend" / "static"


def main():
    # Build frontend if dist doesn't exist or is explicitly requested
    if not DIST.exists() or "--build-frontend" in sys.argv:
        print("Building frontend...")
        subprocess.run(["npm", "run", "build"], cwd=FRONTEND, check=True)

    # Copy dist → backend/static
    if STATIC.exists():
        shutil.rmtree(STATIC)
    print(f"Copying {DIST} → {STATIC}")
    shutil.copytree(DIST, STATIC)
    print("Done. Run `python -m build --wheel` to build the package.")


if __name__ == "__main__":
    main()
