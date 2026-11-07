// Starter menu from The Fusion Baking's own photos (public/seed/*.webp).
// Loaded automatically the first time the shop runs with an empty catalogue,
// or on demand from Admin → Products → "Load starter menu".
// Prices start at 0 ("Price on request") — set them in the admin.

const base = {
  category: 'Cookies', tagline: '', description: '', ingredients: '', size: '', tags: [],
  classicPrice: 0, nutritiousPrice: 0, offerClassic: true, offerNutritious: true, nutritiousNote: 'Whole wheat',
  diet: 'both', featured: false, available: true, hidden: false,
}

export const SEED_PRODUCTS = [
  {
    name: 'Ragi Almond Biscuits', category: 'Biscuits', image: '/seed/ragi-almond-biscuits.webp',
    tagline: 'Golden crunch every bite', diet: 'eggless', nutritiousNote: 'Ragi & almond flour', featured: true,
    description: 'Made with the nourishing power of ragi and the crunch of premium almonds, for a snack you’ll love every day.',
  },
  {
    name: 'Choco Chip Cookies', image: '/seed/choco-chip-cookies.webp',
    tagline: 'Sweet treats', featured: true,
    description: 'Dashed chocolate on premium choco chips, with the goodness of whole wheat.',
  },
  {
    name: 'Walnut Choco Brownie', category: 'Brownies', image: '/seed/walnut-choco-brownie.webp',
    tagline: 'Loads of chocolate', featured: true,
    description: 'Rich chocolate meets crunchy walnuts in a brownie that’s fudgy and indulgent.',
  },
  {
    name: 'Pistachio Tea Cake', category: 'Cakes', image: '/seed/pistachio-tea-cake.webp',
    tagline: 'Tea time favourite', featured: true,
    description: 'A soft, buttery loaf crusted with crushed pistachios. Perfect sliced with an evening chai.',
  },
  {
    name: 'Chocolate Marble Cake', category: 'Cakes', image: '/seed/chocolate-marble-cake.webp',
    tagline: 'Swirled to perfection',
    description: 'A soft vanilla and chocolate loaf, marbled through and baked in its own paper mould. Lovely with a glass of cold milk.',
  },
  {
    name: 'Almond Loaf Cake', category: 'Cakes', image: '/seed/almond-loaf-cake.webp',
    tagline: 'Nutty tea time treat',
    description: 'A golden tea loaf topped with a generous layer of toasted sliced almonds.',
  },
  {
    name: 'Ragi Choco Biscuits', category: 'Biscuits', image: '/seed/ragi-choco-biscuits.webp',
    tagline: 'Healthy made simple', diet: 'eggless', nutritiousNote: 'Ragi & almond flour',
    description: 'Made with the nourishing power of ragi and almond flour, for a snack you’ll love every day.',
  },
  {
    name: 'Ragi Walnut Biscuits', category: 'Biscuits', image: '/seed/ragi-walnut-biscuits.webp',
    tagline: 'Healthy made simple', diet: 'eggless', nutritiousNote: 'Ragi & whole wheat',
    description: 'Made with the nourishing power of ragi and the crunch of premium walnuts.',
  },
  {
    name: 'Choco Chip Mini Cookies', image: '/seed/choco-chip-mini-cookies.webp',
    tagline: 'Snack small, smile big',
    description: 'Wholesome whole wheat meets premium choco chips in every crunchy bite.',
  },
  {
    name: 'Coconut Cookies', image: '/seed/coconut-cookies.webp',
    tagline: 'Dipped, drizzled & sprinkled',
    description: 'Golden coconut cookies finished four ways: chocolate-dipped, coconut-dusted, drizzled, or with rainbow sprinkles.',
  },
  {
    name: 'Dry Fruit Cookies', image: '/seed/dry-fruit-cookies.webp',
    tagline: 'Homemade goodness',
    description: 'Melt-in-the-mouth butter cookies studded with almonds and pistachios.',
  },
  {
    name: 'Almond Biscuits', category: 'Biscuits', image: '/seed/almond-biscuits.webp',
    tagline: 'Crisp & buttery',
    description: 'Crisp, golden biscuits baked with almond for a delicate nutty crunch.',
  },
  {
    name: 'Cranberry Muffin', category: 'Muffins', image: '/seed/cranberry-muffin.webp',
    tagline: 'Fruity & soft',
    description: 'A tender muffin dotted with tangy cranberries, baked in a tulip wrap.',
  },
].map((p, i) => ({ ...base, ...p, sortOrder: i + 1 }))
