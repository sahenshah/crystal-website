# Crystal Industries Website

This is the official website for Crystal Industries Ltd., built with Node.js, Express, and modern HTML/CSS/JS. It features a product catalog, product detail pages, a contact form with email integration, company information, and product filtering.

## Features

- **Product Catalog:** Browse products with images, details, and filtering.
- **Product Filtering:** Filter products by brand and finish using dropdown controls.
- **Product Detail Pages:** View detailed information and sizes for each product.
- **Contact Form:** Visitors can send messages directly to the company email.
- **Admin Panel:** (If enabled) Edit and manage products.
- **Responsive Design:** Works well on desktop and mobile devices.
- **Modern UI:** Clean, minimalist, and brand-aligned styling.

## Tech Stack

- **Frontend:** HTML5, CSS3 (custom, no frameworks), JavaScript
- **Backend:** Node.js, Express
- **Database:** 
  - **Local Development:** SQLite (default, for easy setup)
  - **Production/Live (e.g. Render):** PostgreSQL (psql)
- **Email:** Nodemailer with Gmail App Password

## Database Structure

- **Local:** Uses `SQLite` database file (`products.db`). No setup required; tables are created automatically on first run.
- **Production/Live:** Uses `PostgreSQL` (psql). The app will connect using the `DATABASE_URL` environment variable (as provided by Render or your hosting provider). The `products` table is created automatically if it does not exist.

**Table schema (both SQLite and PostgreSQL):**
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,         -- INTEGER PRIMARY KEY AUTOINCREMENT for SQLite
  name TEXT,
  brand TEXT,
  finish TEXT,
  description TEXT,
  images TEXT,                  -- JSON stringified array
  sizes TEXT                    -- JSON stringified array
);
```

## Setup Instructions

1. **Clone the repository:**
    ```sh
    git clone https://github.com/yourusername/crystal-website.git
    cd crystal-website
    ```

2. **Install dependencies:**
    ```sh
    npm install
    ```

3. **Configure Email Sending:**
    - Create a dedicated Gmail account for the website.
    - Enable 2-Step Verification and generate an [App Password](https://support.google.com/accounts/answer/185833?hl=en).
    - In `server.js`, set the Gmail address and app password in the Nodemailer transporter.

4. **Configure Database:**

    - **Local Development (SQLite):**
      - No setup required. The app will use `products.db` in the project root.
      - Products table is created automatically.

    - **Production/Live (PostgreSQL):**
      - Provision a PostgreSQL database (e.g., using Render's PostgreSQL add-on).
      - Set the `DATABASE_URL` environment variable in your hosting dashboard to the connection string provided by your PostgreSQL provider.
      - The app will automatically create the `products` table if it does not exist.

5. **Run the server:**
    ```sh
    node server.js
    ```
    The site will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
/crystal-website/
    ├── public/
    │   ├── css/
    │   ├── images/
    │   ├── js/
    │   ├── index.html
    │   ├── contact.html
    │   ├── about.html
    │   ├── products.html
    │   └── product.html
    ├── server.js
    ├── package.json
    └── README.md
```

## Customization

- **Products:** Update the database or use the admin panel (if enabled) to add/edit products.
- **Branding:** Replace images and update colors in CSS to match your brand.
- **Contact Email:** Change the recipient in server.js as needed.

## Security Notes

- Never commit your Gmail app password or sensitive credentials to version control.
- Use a dedicated Gmail account for website emails, not your personal account.
- For production, always use environment variables for database credentials.

## License

This project is for Crystal Industries Ltd. and is not licensed for public redistribution.

Crystal Industries Ltd.  
info@crystalindustries.co.ke


