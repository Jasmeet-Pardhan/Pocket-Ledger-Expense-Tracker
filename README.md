# Pocket-Ledger-Expense-Tracker

A lightweight expense tracker built with HTML5, Tailwind CSS (CDN) and vanilla JavaScript. No build step, no backend. Your data stays in your browser (localStorage).

## Features

- Monthly salary, with the latest earlier salary carried forward to new months
- Expenses in 9 categories, including **Others** where you write what you spent on (required) and the date
- Monthly report: category donut and bars, with the most-spent category highlighted
- Weekly report: Monday to Sunday daily bars, week total, daily average and top category, with Prev/Next navigation
- Multiple currencies: enter each expense in any of 12 currencies, reports convert to your base currency
- Editable exchange rates, plus a "Fetch live rates" button (open.er-api.com)
- Monthly budget with a progress bar that turns amber at 80% and red when exceeded
- Edit, delete, filter by category and search notes
- Export all expenses to CSV
- Dark mode

## Files

```
index.html   page structure
style.css    theme colors and component styles
script.js    app logic (storage, conversion, reports)

```

## Run it

Open `index.html` in a browser, or publish with GitHub Pages: Settings > Pages > Deploy from branch > `main` / root. An internet connection is needed for the Tailwind CDN and fonts.

## Customize

- Categories and their colors: `CATS` at the top of `script.js`
- Currencies and default rates: `DEFAULT_RATES` in `script.js`
- Colors: CSS variables at the top of `style.css`
