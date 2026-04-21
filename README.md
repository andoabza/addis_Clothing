# 👕 Addis Clothing Store

**Ethiopian modern fashion – delivered to your door in Addis Ababa**

A full‑stack e‑commerce platform built for the local market with Telebirr/CBE Birr integration, OpenStreetMap address picker, admin dashboard, and printable delivery tickets.

---

## 🚀 Features

### 👤 User
- Register/Login (phone + password, with email optional)
- Forgot password (OTP via phone)
- Browse products with filters (category, size, price)
- Search products
- Add to cart, update quantity, remove items
- Checkout with:
  - Saved addresses or new address
  - Map picker (OpenStreetMap + reverse geocoding)
  - Delivery zone selection (Addis zones with fees)
  - Preferred delivery date & order notes
- Payment via **Chapa** (Telebirr, CBE Birr) – real integration
- Order history with status tracking
- Cancel orders (if pending/confirmed) – restores stock
- Reorder (add previous order items to cart)
- View order details and progress bar
- Wishlist
- Recently viewed products
- Profile management (edit name/email, change password)
- Saved addresses (add/edit/delete, set default)
- Delete account (permanent)

### 👑 Admin
- Dashboard with stats (orders, revenue, products)
- Product management:
  - Add/Edit/Delete products
  - Cloudinary image upload (with retry on failure)
  - Add variants (size, color, stock, price adjustment)
- Order management:
  - View all orders
  - Update order status
  - Print **custom delivery ticket** (PDF with QR code, receipt style)
- Product history log (track create/update/delete actions)
- Confirm payments manually

### 📦 Additional
- Responsive design (mobile‑first)
- Progressive Web App (PWA) ready
- Order polling after payment
- QR code on ticket for verification
- Delivery zones database (Addis Ababa)
- Promo codes (ready for implementation)

---

## 🛠️ Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Frontend    | React 18 + Vite, Tailwind CSS, Framer Motion   |
| Backend     | Node.js, Express, MySQL2, JWT, bcryptjs        |
| Database    | MySQL                                           |
| Payments    | Chapa API (Telebirr, CBE Birr)                 |
| Maps        | Leaflet + OpenStreetMap (Nominatim geocoding)  |
| File Upload | Cloudinary + Multer                             |
| PDF Generation | PDFKit + QRCode                              |
| Hosting     | Frontend: Vercel/Netlify, Backend: VPS/Railway |

---

## 📦 Installation

### Prerequisites
- Node.js (v18+)
- MySQL (v8+)
- Cloudinary account (free tier)
- Chapa test account (for payment simulation)

### 1. Clone the repository
```bash
git clone https://github.com/andoabza/addisclothing.git
cd addis-clothing-store
```

### 2. Set up the database
```bash
# Create database and tables
mysql -u root -p < database/schema.sql
```

### 3. Backend setup
```bash
cd backend
npm install
cp .env.example .env   # fill in your credentials
npm run dev
```

### 4. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:5000/api
npm run dev
```

---

## 🔧 Environment Variables

### Backend (`.env`)
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=addis_clothing
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

CHAPA_SECRET_KEY=chapa_test_your_key
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🗄️ Database Schema

The database includes:
- `users`, `products`, `variants`, `categories`
- `carts`, `cart_items`, `orders`, `order_items`
- `delivery_zones`, `saved_addresses`
- `wishlist`, `recently_viewed`, `product_history`

Run `database/schema.sql` to create all tables.

---

## 🧪 Testing Payment (Chapa Sandbox)

1. Use test card numbers from [Chapa documentation](https://docs.chapa.co/docs/test-cards)
2. After placing an order, the user is redirected to Chapa checkout (inside an iframe modal)
3. Complete test payment → webhook updates order status to `paid` and `confirmed`
4. Polling on the payment status page confirms success

---

## 📄 API Endpoints (Selected)

| Method | Endpoint                     | Description                    |
|--------|------------------------------|--------------------------------|
| POST   | `/api/auth/register`         | User registration              |
| POST   | `/api/auth/login`            | User login                     |
| GET    | `/api/products`              | List all products (with variants) |
| POST   | `/api/cart/add`              | Add item to cart               |
| POST   | `/api/orders`                | Create order                   |
| POST   | `/api/payment/initiate/:id`  | Start Chapa payment            |
| GET    | `/api/orders/my-orders`      | User order history             |
| PUT    | `/api/orders/cancel/:id`     | Cancel order (restores stock)  |
| GET    | `/api/admin/orders/:id/ticket` | Download delivery ticket (PDF) |
| POST   | `/api/admin/upload`          | Cloudinary image upload        |

Full API documentation is available in Postman/Insomnia collection (ask the developer).

---

## 🖨️ Delivery Ticket
![Reciept](/frontend/public/Screenshot.png)


Admin can print a **receipt‑style PDF** containing:
- Order summary, customer info, delivery address
- Itemised list with quantities and prices
- QR code (scan to verify order)
- Generation timestamp and thank‑you message

The ticket is designed to fit one A4 page even with many items.

---

## 🗺️ Map Address Picker

On checkout, users can click **Pick from map**:
- Opens an OpenStreetMap modal
- Click anywhere → reverse geocoding fills the address field
- Automatically detects delivery zone (suburb) and preselects zone

---

## 🚀 Deployment

### Backend (example on Railway / VPS)
```bash
# Use PM2 or systemd for production
npm install -g pm2
pm2 start server.js --name addis-backend
```

### Frontend (Vercel)
```bash
npm run build
# Deploy `dist` folder to Vercel/Netlify
```

### Database
Use a managed MySQL service (e.g., Aiven, Clever Cloud) or host on same VPS.

---

## 👥 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📝 License

MIT – feel free to use for your own business.

---

## 🙏 Acknowledgements

- [Chapa](https://chapa.co) – Ethiopian payment gateway
- [OpenStreetMap](https://www.openstreetmap.org) & Nominatim – free maps
- [Cloudinary](https://cloudinary.com) – image hosting
- [Unsplash](https://unsplash.com) – placeholder fashion images
- [React Leaflet](https://react-leaflet.js.org) – map integration

---

## 📧 Contact

For support or customisation:  
**Email:** lermasuse@gmail.com  
**Telegram:** @addisclothing

---

*Built with ❤️ for Addis Ababa's fashion lovers*