# UBC Workday2Cal

Convert your UBC Workday course schedule into calendar events that work with Google Calendar, Apple Calendar, Outlook, and more.

## Overview

UBC Workday2Cal is a web application that helps UBC students easily import their course schedules from Workday into their preferred calendar applications. Simply export your courses from Workday as an Excel file, upload it to this tool, and download a standard `.ics` calendar file that can be imported into any calendar app.

## Features

- 📅 **Universal Compatibility** - Generates standard `.ics` files that work with all major calendar applications
- 🎯 **Accurate Parsing** - Handles complex scheduling patterns including alternate weeks
- ⚡ **Fast Processing** - Convert your entire semester schedule in seconds
- 🔒 **Privacy First** - All processing happens on the server with no data stored
- 🎨 **Clean Interface** - Step-by-step guided process with helpful instructions

## Tech Stack

- **Frontend**: [SvelteKit 2](https://kit.svelte.dev/) with Svelte 5
- **Styling**: [TailwindCSS 4](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/)
- **Calendar Generation**: [ical-generator](https://github.com/sebbo2002/ical-generator)
- **Excel Parsing**: [xlsx](https://sheetjs.com/)
- **Date/Time**: [Luxon](https://moment.github.io/luxon/)
- **Deployment**: [Cloudflare Pages](https://pages.cloudflare.com/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/jackkoskie/ubc-workday2cal.git
cd ubc-workday2cal

# Install dependencies
pnpm install
```

### Development

```bash
# Start the development server
pnpm dev

# Open http://localhost:5173 in your browser
```

### Building

```bash
# Create a production build
pnpm build

# Preview the production build locally
pnpm preview
```

### Deployment

This project is configured to deploy to Cloudflare Pages:

```bash
# Deploy to Cloudflare
pnpm deploy
```

## How It Works

1. **Export from Workday**: Students export their enrolled courses from UBC's Workday system as an Excel (.xlsx) file
2. **Upload & Parse**: The application reads the Excel file and extracts course information including:
   - Course names and codes
   - Meeting patterns (days and times)
   - Date ranges
   - Alternate week patterns
3. **Generate Calendar**: Creates individual calendar events for each class session throughout the semester
4. **Download**: User receives a `.ics` file that can be imported into any calendar application

## Project Structure

```
workday-to-calendar/
├── src/
│   ├── routes/
│   │   ├── +page.svelte        # Main UI with step-by-step wizard
│   │   ├── +page.server.ts     # Server-side Excel processing & ICS generation
│   │   └── +layout.svelte      # Layout wrapper
│   ├── lib/
│   │   └── assets/             # Images and static assets
│   ├── app.html                # HTML template
│   └── app.css                 # Global styles
├── static/                      # Static files
├── wrangler.jsonc              # Cloudflare configuration
├── svelte.config.js            # SvelteKit configuration
└── package.json                # Dependencies and scripts
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm check` - Run TypeScript and Svelte checks
- `pnpm format` - Format code with Prettier
- `pnpm lint` - Lint code with ESLint
- `pnpm deploy` - Deploy to Cloudflare Pages

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [AGPL 3.0 License](LICENSE).

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/jackkoskie/ubc-workday2cal/issues) on GitHub.
