# JD Orders Helper

A Chrome extension to help you manage your JD orders and download invoices in bulk.

## Features

- Manage JD.com orders efficiently
- Bulk download invoices
- Built with Vue 3 and WXT framework

## Tech Stack

- **Framework:** [WXT](https://wxt.dev/) - Next-gen web extension framework
- **Frontend:** Vue 3 with TypeScript
- **Package Manager:** pnpm
- **Build Tool:** WXT with Vue module

## Prerequisites

- Node.js (latest LTS version recommended)
- pnpm package manager
- Chrome or Firefox browser

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd jd-invoice-downloader
```

2. Install dependencies:
```bash
pnpm install
```

## Development

### Chrome
```bash
pnpm dev
```

### Firefox
```bash
pnpm dev:firefox
```

The extension will be built to the `.output` directory and loaded in development mode with hot reload.

## Building for Production

### Chrome
```bash
pnpm build
pnpm zip
```

### Firefox
```bash
pnpm build:firefox
pnpm zip:firefox
```

The production build will be created in the `.output` directory, and the zip file will be ready for store submission.

## Project Structure

```
├── assets/              # Static assets
├── components/          # Vue components
│   └── HelloWorld.vue
├── entrypoints/         # Extension entry points
│   ├── background.ts    # Background script
│   ├── content.ts       # Content script
│   └── popup/           # Popup UI
│       ├── App.vue
│       ├── index.html
│       ├── main.ts
│       └── style.css
├── public/              # Public assets
│   └── icon/            # Extension icons
└── wxt.config.ts        # WXT configuration
```

## Configuration

The extension is configured in [wxt.config.ts](wxt.config.ts) with:
- **Name:** JD orders helper
- **Version:** 1.0.0
- **Permissions:** Access to `*.jd.com` domains

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## Type Checking

```bash
pnpm compile
```

## License

[Add your license here]
