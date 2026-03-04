# POS - Point of Sale System

A mobile-first Point of Sale web application with barcode scanning, inventory management, sales processing with invoice generation, and email delivery.

## Tech Stack

- **Backend:** C# .NET Core 9 Web API
- **Database:** MongoDB
- **Frontend:** React 19 + Vite
- **Barcode Scanning:** Native BarcodeDetector API (with manual fallback)
- **Email:** MailKit (SMTP)
- **Icons:** Lucide React

## Features

### Admin - Inventory Management
- Scan barcode to add/edit products
- Full product details: name, description, category, SKU, cost price, selling price, discount %, stock quantity, reorder level
- Profit margin calculation
- Low stock alerts
- Search and filter products
- Soft delete (deactivate) products

### Sales Process
1. **Enter client details** (name + email)
2. **Auto-generated invoice number** (INV-000001 format)
3. **Scan products** to add to order (auto-calculates totals)
4. **Adjust quantities** with +/- buttons
5. **Select payment method** (Cash / Card / EFT)
6. **Confirm sale** → deducts stock from DB → emails invoice to client
7. **Success screen** with sale summary

### Dashboard
- Total products, stock value, low stock count, out of stock count
- Low stock alerts list
- Quick action buttons

### Order History
- View past transactions
- Search by invoice number, client name, or email
- Full order detail view

## Getting Started

### Prerequisites
- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for MongoDB) — or a local/remote MongoDB instance

### 1. Start MongoDB

```bash
docker compose up -d
```

### 2. Configure the Backend

Edit `POS.Api/appsettings.json`:

```json
{
  "MongoDb": {
    "ConnectionString": "mongodb://localhost:27017",
    "DatabaseName": "pos_db"
  },
  "Email": {
    "SmtpServer": "smtp.gmail.com",
    "SmtpPort": 587,
    "SenderEmail": "your-email@gmail.com",
    "SenderName": "POS Store",
    "Password": "your-app-password",
    "UseSsl": true
  },
  "App": {
    "CompanyName": "My POS Store",
    "CompanyAddress": "123 Main Street, Cape Town",
    "CompanyPhone": "+27 21 123 4567",
    "CompanyEmail": "info@myposstore.co.za",
    "DefaultTaxRate": 15,
    "CurrencySymbol": "R",
    "InvoicePrefix": "INV"
  }
}
```

> **Gmail:** Use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

### 3. Run the Backend

```bash
cd POS.Api
dotnet run
```

The API starts on `http://localhost:5000`.

### 4. Install & Run the Frontend

```bash
cd pos-frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:5173` and proxies API calls to the backend.

### 5. Open on Mobile

Access the app on your phone via your computer's local IP:

```
http://<your-ip>:5173
```

> Camera barcode scanning requires HTTPS or localhost. For mobile testing over LAN, you may need to configure Vite with HTTPS or use a tunnel like [ngrok](https://ngrok.com/).

## API Endpoints

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| GET | `/api/products/active` | Get active products |
| GET | `/api/products/{id}` | Get product by ID |
| GET | `/api/products/barcode/{barcode}` | Get product by barcode |
| GET | `/api/products/search/{query}` | Search products |
| GET | `/api/products/low-stock` | Get low stock products |
| GET | `/api/products/dashboard` | Get dashboard stats |
| POST | `/api/products` | Create product |
| PUT | `/api/products/{id}` | Update product |
| PATCH | `/api/products/{id}/stock` | Update stock quantity |
| DELETE | `/api/products/{id}` | Soft delete product |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create new order |
| GET | `/api/orders/{id}` | Get order by ID |
| GET | `/api/orders/invoice/{number}` | Get by invoice number |
| GET | `/api/orders/recent` | Get recent orders |
| POST | `/api/orders/{id}/items` | Add item (by barcode) |
| PUT | `/api/orders/{id}/items/{productId}` | Update item quantity |
| DELETE | `/api/orders/{id}/items/{productId}` | Remove item |
| POST | `/api/orders/{id}/complete` | Complete & send invoice |
| POST | `/api/orders/{id}/cancel` | Cancel order |

## Project Structure

```
POS/
├── docker-compose.yml          # MongoDB container
├── POS.Api/                    # .NET Core Backend
│   ├── Configuration/          # Settings classes
│   ├── Models/                 # MongoDB document models
│   ├── Services/               # Business logic
│   ├── Controllers/            # API endpoints
│   ├── Program.cs              # App startup & DI
│   └── appsettings.json        # Configuration
└── pos-frontend/               # React Frontend
    ├── src/
    │   ├── api.js              # Axios API client
    │   ├── App.jsx             # Router & layout
    │   ├── index.css           # Mobile-first styles
    │   ├── components/
    │   │   ├── BarcodeScanner.jsx  # Camera barcode scanner
    │   │   └── Toast.jsx          # Notification toasts
    │   ├── hooks/
    │   │   └── useToast.jsx       # Toast context
    │   └── pages/
    │       ├── Dashboard.jsx      # Stats & overview
    │       ├── Inventory.jsx      # Admin stock management
    │       ├── NewSale.jsx        # Sales flow (4 steps)
    │       └── OrderHistory.jsx   # Past transactions
    ├── index.html
    └── vite.config.js
```
