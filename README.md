# The Fusion Baking

An online shop for a home bakery selling cakes, cookies, biscuits, muffins, brownies and breads, built for India. It has a customer storefront, customer accounts, ordering, bulk and party enquiries, and an admin area where **you upload a folder of photos and every photo becomes a product** that you can then edit.

- **Frontend:** React and Vite, styled after the @thefusionbaking Instagram posters: linen background, cocoa text, caramel-gold capitals, kraft-paper label strip, and taped polaroid photo frames. Fonts are Mrs Saint Delafield (script), Cinzel (taglines) and Jost (body), all self-hosted.
- **Every item:** Classic and/or Nutritious versions with separate prices, and green/red marks for eggless or with egg. "Both" lets the customer choose at the same price.
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

## Starter menu

The shop comes with 11 items made from The Fusion Baking's own photos (`public/seed/`, defined in `netlify/functions/lib/seed.mjs`). They load automatically the first time the site runs with an empty catalogue. All prices start at 0 ("Price on request"), so set them in **Admin → Products**. Every name, description and photo can be edited. If you clear the catalogue, the starter menu doesn't come back unless you click **Load starter menu**.

## Using the admin area

Go to `/admin/login`. There's also a "Staff sign in" link in the footer. Enter `ADMIN_PASSWORD`; the eye icon shows or hides it.

### Upload a folder of photos

On **Upload folder**, click *Choose folder* or drag the folder onto the page. Before you upload, you can review and edit every item's name, category and price. Photos are resized in the browser to a maximum of 1600 px (WebP) before upload.

How the folder is read:

| What you do | Result |
|---|---|
| `Bakery/Cakes/red-velvet-cake.jpg` | Item "Red Velvet Cake" in **Cakes** (the sub-folder name is the category) |
| `Bakery/red-velvet-cake.jpg` (no sub-folder) | Category guessed from the name (cake, cookie, muffin, brownie, bread, croissant…) |
| `ragi-walnut-biscuits__340.jpg` | Classic price ₹340 |
| `ragi-walnut-biscuits__340__380.jpg` | Classic ₹340 and Nutritious ₹380 |
| `details.csv` in the folder | Extra details per photo (see below) |
| Uploading a photo whose item name already exists | Replaces that item's photo and keeps your edits |

Optional `details.csv` columns (only `file` or `name` is required):

```csv
file,name,category,classic_price,nutritious_price,nutritious_note,diet,tagline,description,size,ingredients,tags,featured
belgium-dark-chocolate-cake.jpg,,Cakes,850,950,Whole wheat & jaggery,both,Dark chocolate treat,"Layers of rich Belgian dark chocolate.",500 g,,Bestseller,yes
```

`diet` is `eggless` (green mark), `egg` (red mark) or `both` (the customer chooses). It defaults to `both`.

### Edit items

On **Products**, click any item to edit:

- name, category (or create a new one) and gold tagline
- Classic and Nutritious versions: switch each on or off, set its price, and say what makes the Nutritious version nutritious
- eggless, with egg, or the customer's choice
- description, size, ingredients and allergens, and labels
- photo, and whether it's in stock, shown on the home page, or hidden

Use the checkboxes for bulk actions: move to a category, set the egg mark, mark sold out, hide or show, delete.

### Orders, customers and settings

- **Orders & enquiries:**
  - **Shop orders** show each item's version (Classic or Nutritious) and egg choice. There's a one-tap "Confirm on WhatsApp" message, and you set each order's status, which customers see on their account page.
  - **Bulk enquiries** come from the "Bulk & party orders" form.
- **Customers:** everyone who has registered.
- **Shop settings:**
  - Logo upload (a transparent PNG works best)
  - Home page tagline, headline and text
  - WhatsApp number. Setting it turns on the floating "Order on WhatsApp" button and WhatsApp links.
  - Phone, email, address and order hours
  - FSSAI licence number, shown in the footer
  - Currency (default `₹`, with Indian digit grouping) and Instagram link

## Customers

Customers register with a name, email and password (at least 8 characters, with an eye toggle) and sign in to check out.

1. On each item they pick Classic or Nutritious, and eggless or with egg when both are offered.
2. At checkout they choose delivery (address and PIN code) or collection, a date from tomorrow onwards, and add notes.
3. After ordering they can send the order to you on WhatsApp in one tap.

There's no online payment yet: orders are confirmed on WhatsApp or by phone and paid on delivery. UPI through Razorpay can be added later.

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
