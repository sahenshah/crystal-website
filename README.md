# Crystal Industries Website

This is the official website for Crystal Industries Ltd., built with Node.js, Express, and modern HTML/CSS/JS. It features a product catalog, product detail pages, a contact form with email integration, and company information.

## Features

- **Product Catalog:** Browse products with images, details, and filtering.
- **Product Detail Pages:** View detailed information and sizes for each product.
- **Contact Form:** Visitors can send messages directly to the company email.
- **Admin Panel:** (If enabled) Edit and manage products.
- **Responsive Design:** Works well on desktop and mobile devices.
- **Modern UI:** Clean, minimalist, and brand-aligned styling.

## Tech Stack

- **Frontend:** HTML5, CSS3 (custom, no frameworks), JavaScript
- **Backend:** Node.js, Express
- **Database:** SQLite (for product data)
- **Email:** Nodemailer with Gmail App Password

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

4. **Run the server:**
    ```sh
    node server.js
    ```

    The site will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure
crystal-website/ ├── public/ │ ├── css/ │ ├── images/ │ ├── js/ │ ├── index.html │ ├── contact.html │ ├── about.html │ ├── products.html │ └── product.html ├── server.js ├── package.json └── README.md


Customization
Products: Update the database or use the admin panel (if enabled) to add/edit products.
Branding: Replace images and update colors in CSS to match your brand.
Contact Email: Change the recipient in server.js as needed.
Security Notes
Never commit your Gmail app password or sensitive credentials to version control.
Use a dedicated Gmail account for website emails, not your personal account.
License
This project is for Crystal Industries Ltd. and is not licensed for public redistribution.

Crystal Industries Ltd.
info@crystalindustries.co.ke


