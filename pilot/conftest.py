import sys
from pathlib import Path

# Make `import pilot` work when pytest is started from the repository root or from pilot/.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
