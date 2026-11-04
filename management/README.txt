JIVAAN FOOTWEAR MANAGEMENT - OFFLINE-FIRST PILOT

Files:
- index.html: staff application
- manifest.webmanifest: installable web app metadata
- sw.js: app shell and QR generator caching

TOKEN MAP - STALL 1:
A1-A50, B51-B100, C101-C150, D151-D200 (200 total).

FEATURES:
- Offline-first local browser storage
- Deposit creates a unique customer QR and 12-hour expiry
- Customer photographs the QR
- Collection checks QR validity and prevents reuse
- Bag availability dashboard
- Permanent bag QR label generation
- Export/import JSON backup for moving records between devices

IMPORTANT OFFLINE LIMITATION:
Because you selected fully offline operation and two devices, records are stored separately on each device. There is no automatic live sharing between devices without a local network server or an internet-connected sync service. Use Backup/Transfer to export the JSON file on one device and transfer it with Quick Share/Bluetooth, then import it on the other. Avoid working on the same bag simultaneously on two devices.

INSTALL:
1. Publish this management folder as a GitHub Pages site or copy it to an HTTPS host.
2. Open the app once while internet is available so the service worker can cache the app and QR generator.
3. Add to Home Screen / Install App on both Android devices.
4. Test deposit and collection with sample bags before any live event.
5. For camera scanning, use Chrome on Android and grant camera permission. If BarcodeDetector is unsupported, use a USB QR scanner or enter the QR code manually.

PRODUCTION NOTE:
This is a pilot build, not a fully audited production system. Browser local storage can be cleared or lost if the device is reset. Export backups frequently. Add staff PINs, encrypted backups, multi-device synchronization and a supervisor recovery workflow before relying on it for high-volume events.
