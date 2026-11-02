# Baba Fareed Seed Corporation - Enterprise Accounting & ERP System

Enterprise ERP and General Ledger web application for **Baba Fareed Seed Corporation**, 7-K.M Multan Road Vehari.

## Running in VS Code

1. Clone or open this folder in **Visual Studio Code**.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your environment variables in `.env` (copy from `.env.example`):
   ```env
   MYSQL_HOST="mysql.gb.stackcp.com"
   MYSQL_PORT="45504"
   MYSQL_USER="nasir-945e"
   MYSQL_PASSWORD="r55{|CPnP-!a"
   MYSQL_DATABASE="ac-bfsc-353033376d35"
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build for Production

```bash
npm run build
npm start
```
