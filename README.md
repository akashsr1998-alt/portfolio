# Akash Subudhi — AI-Focused SDET Portfolio

A static portfolio website that covers my test automation skills and how I use AI agents in QA (LLM test generation, Playwright MCP, RAG, self-healing locators, failure triage and DeepEval).

**Live site:** https://akashsr1998-alt.github.io/portfolio/

## Structure
```
portfolio/
├── index.html        # Page content
├── css/style.css     # Styles (dark theme, responsive)
├── js/main.js        # Interactive AI-agent demo (simulated)
├── assets/favicon.svg
├── .nojekyll         # Serve files as-is on GitHub Pages
└── README.md
```

## Run locally
Open `index.html` in a browser, or run:
```bash
python -m http.server 8000   # then visit http://localhost:8000
```

## Deploy (GitHub Pages)
```bash
git add .
git commit -m "Update portfolio"
git push origin main
```
Then go to **Settings → Pages → Deploy from a branch → main / (root) → Save**.

> Note: the agent demo is a front-end simulation. It does not call a real LLM.
