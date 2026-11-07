# The Fusion Baking

An online shop for a bakery selling cakes, cookies, muffins, brownies, breads and pastries. It has a customer storefront, customer accounts, ordering, and an admin area where **you upload a folder of photos and every photo becomes a product** that you can then edit.

- **Frontend:** React and Vite in a "salon pâtisserie" theme: pistachio, salon green and gilt, Bodoni Moda type, arched shop-window frames.
- **Backend:** one Netlify Function (`netlify/functions/api.mjs`).
- **Storage:** [Netlify Blobs](https://docs.netlify.com/blobs/overview/) holds products, photos, customers, orders and settings. You don't need a separate database.
- **CI/CD:** Netlify Git deploys from `netlify.toml`, plus a GitHub Actions workflow that builds every push and PR. The workflow can also deploy, but that's optional.

## Deploy to Netlify (one time)

1. In Netlify, choose **Add new site → Import an existing project → GitHub** and pick this repo. Netlify reads the build settings from `netlify.toml`: `npm run build`, publish `dist`, functions in `netlify/functions`.
2. Under **Site configuration → Environment variables**, add:
   - `ADMIN_PASSWORD`: the password for `/admin/login`
   - `JWT_SECRET`: a long random string. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
3. Deploy. After that, every push to `main` deploys to production and every pull request gets a deploy preview.

**Optional: deploy from GitHub Actions instead.** Add the repo secrets `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`, and the `deploy` job in `.github/workflows/ci-cd.yml` will deploy with the Netlify CLI. If you leave those secrets out, the job skips and Netlify's own Git integration handles deploys. Use one method or the other, not both.

## Using the admin area

Go to `/admin/login`. There's also a "Staff sign in" link in the footer. Enter `ADMIN_PASSWORD`; the eye icon shows or hides it.

### Upload a folder of photos

On **Upload folder**, click *Choose folder* or drag the folder onto the page. Before you upload, you can review and edit every item's name, category and price. Photos are resized in the browser to a maximum of 1600 px (WebP) before upload.

How the folder is read:

| What you do | Result |
|---|---|
| `Bakery/Cakes/red-velvet-cake.jpg` | Item "Red Velvet Cake" in **Cakes** (the sub-folder name is the category) |
| `Bakery/red-velvet-cake.jpg` (no sub-folder) | Category guessed from the name (cake, cookie, muffin, brownie, bread, croissant…) |
| `red-velvet-cake__52.jpg` | Price set to 52 |
| `details.csv` in the folder | Extra details per photo (see below) |
| Uploading a photo whose item name already exists | Replaces that item's photo and keeps your edits |

Optional `details.csv` columns (only `file` or `name` is required):

```csv
file,name,category,price,description,size,ingredients,tags,featured
red-velvet-cake__52.jpg,,,,"Cream cheese frosting on a tender cocoa crumb.",1 kg,,"Bestseller, Eggless",yes
```

### Edit items

On **Products**, click any item to edit its name, category (or create a new one), price, description, size, ingredients and allergens, and labels such as *Eggless* or *Bestseller*. You can also replace its photo and set whether it's in stock, shown on the home page, or hidden. Use the checkboxes for bulk actions: move to a category, mark sold out, hide or show, delete.

### Orders, customers and settings

- **Orders:** see every order with the customer's contact details, collection or delivery, date and notes, and change its status (New, Confirmed, Baking, Ready, Completed, Cancelled). Customers see that status on their account page.
- **Customers:** everyone who has registered.
- **Shop settings:** shop name, home page headline and text, currency symbol (`$`, `S$`, `₹`…), phone, email, address, opening hours, ordering note and Instagram link.

## Customers

Customers register with a name, email and password (at least 8 characters, with an eye toggle) and sign in to check out. At checkout they choose collection or delivery, a date, and add notes. There's no online payment: orders are confirmed by phone or email and paid on collection or delivery. A payment gateway such as Stripe can be added later.

## Local development

```bash
npm install
cp .env.example .env            # set ADMIN_PASSWORD and JWT_SECRET
npm i -g netlify-cli
npm run dev:netlify             # http://localhost:8888, with functions and a local Blobs store
```

Without the Netlify CLI:

```bash
npm run build && node scripts/local-server.mjs   # http://localhost:4321, admin password admin12345
npm run test:api                                  # API smoke tests
```

## Security notes

- Customer passwords are hashed with scrypt and never returned by the API.
- Admin and customer sessions are signed tokens (HMAC-SHA256). Admin sessions expire after 12 hours, customer sessions after 7 days.
- Always set `JWT_SECRET` in production. If you change it, everyone is signed out.
