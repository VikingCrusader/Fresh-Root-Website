/* FreshRoots Cooperative — demo data (fictional farms and products) */

const FARMS = [
  {
    id: "green-valley",
    name: "Green Valley Farm",
    owner: "James Novák",
    distance: 2.3,
    angle: 330,
    cats: ["veg"],
    organic: true,
    img: "img/farm2.jpg",
    avatar: "img/farmer.jpg",
    phone: "+420 776 487 325",
    email: "hello@greenvalley.example",
    instagram: "greenvalleyfarmpraha",
    about: {
      en: "A family-run organic farm growing seasonal vegetables for over 20 years. We harvest in the morning and deliver the same day.",
      cs: "Rodinná bio farma, která už přes 20 let pěstuje sezónní zeleninu. Sklízíme ráno a doručujeme ještě týž den.",
      de: "Ein Bio-Familienbetrieb, der seit über 20 Jahren saisonales Gemüse anbaut. Wir ernten morgens und liefern am selben Tag.",
      zh: "一家经营了 20 多年的家庭有机农场，种植时令蔬菜。早上采摘，当天送达。",
      zht: "一座經營超過 20 年的家庭有機農場，種植當季蔬菜。早上採收，當天送達。",
    },
  },
  {
    id: "root-harvest",
    name: "Root Harvest",
    owner: "Tomáš Černý",
    distance: 3.0,
    angle: 210,
    cats: ["veg"],
    organic: false,
    img: "img/carrots.jpg",
    avatar: "img/farmer.jpg",
    phone: "+420 731 220 918",
    email: "farm@rootharvest.example",
    instagram: "rootharvest.cz",
    about: {
      en: "Root vegetables from sandy soil along the Elbe — carrots, potatoes and beets all year round.",
      cs: "Kořenová zelenina z písčitých půd u Labe — mrkev, brambory a řepa po celý rok.",
      de: "Wurzelgemüse aus sandigen Böden an der Elbe – Karotten, Kartoffeln und Rüben das ganze Jahr.",
      zh: "来自易北河沿岸沙质土壤的根茎类蔬菜——全年供应胡萝卜、土豆和甜菜。",
      zht: "來自易北河沿岸沙質土壤的根莖類蔬菜——全年供應胡蘿蔔、馬鈴薯與甜菜。",
    },
  },
  {
    id: "free-range",
    name: "Free Range Farm",
    owner: "Lukáš Procházka",
    distance: 4.1,
    angle: 140,
    cats: ["eggs"],
    organic: true,
    img: "img/eggs.jpg",
    avatar: "img/farmer.jpg",
    phone: "+420 602 455 107",
    email: "eggs@freerange.example",
    instagram: "freerangefarm.cz",
    about: {
      en: "Our 300 hens roam freely on grass all day. Eggs are collected twice daily.",
      cs: "Našich 300 slepic se celý den volně pohybuje po trávě. Vejce sbíráme dvakrát denně.",
      de: "Unsere 300 Hühner laufen den ganzen Tag frei auf der Wiese. Eier werden zweimal täglich gesammelt.",
      zh: "我们的 300 只母鸡整天在草地上自由活动，每天收集两次鸡蛋。",
      zht: "我們的 300 隻母雞整天在草地上自由活動，每天收集兩次雞蛋。",
    },
  },
  {
    id: "sunny-acres",
    name: "Sunny Acres",
    owner: "Marie Dvořáková",
    distance: 4.7,
    angle: 255,
    cats: ["veg"],
    organic: false,
    img: "img/farm3.jpg",
    avatar: "img/farmer.jpg",
    phone: "+420 728 316 540",
    email: "info@sunnyacres.example",
    instagram: "sunnyacres.farm",
    about: {
      en: "Greenhouse and open-field vegetables grown with minimal spraying on the sunny slopes north of Prague.",
      cs: "Zelenina ze skleníků i z pole, pěstovaná s minimem postřiků na slunných svazích severně od Prahy.",
      de: "Gemüse aus Gewächshaus und Freiland, mit minimalem Spritzmitteleinsatz an den sonnigen Hängen nördlich von Prag angebaut.",
      zh: "在布拉格北部向阳坡地上，以最少喷药方式种植的温室和露天蔬菜。",
      zht: "在布拉格北方向陽坡地上，以最少噴藥方式種植的溫室與露天蔬菜。",
    },
  },
  {
    id: "berry-best",
    name: "Berry Best Farm",
    owner: "Eva Králová",
    distance: 5.0,
    angle: 20,
    cats: ["fruit"],
    organic: true,
    img: "img/organic.jpg",
    avatar: "img/farmer.jpg",
    phone: "+420 739 881 264",
    email: "berries@berrybest.example",
    instagram: "berrybestfarm",
    about: {
      en: "Certified organic berries picked by hand at peak ripeness.",
      cs: "Certifikované bio bobuloviny trhané ručně v plné zralosti.",
      de: "Zertifizierte Bio-Beeren, von Hand in voller Reife gepflückt.",
      zh: "有机认证浆果，在最佳成熟期人工采摘。",
      zht: "有機認證莓果，於最佳成熟期人工採摘。",
    },
  },
  {
    id: "happy-cows",
    name: "Happy Cows Dairy",
    owner: "Petr Svoboda",
    distance: 6.1,
    angle: 90,
    cats: ["dairy"],
    organic: false,
    img: "img/farm1.jpg",
    avatar: "img/farmer.jpg",
    phone: "+420 604 773 192",
    email: "milk@happycows.example",
    instagram: "happycowsdairy",
    about: {
      en: "40 cows on pasture from spring to autumn. Our milk is bottled on the farm every morning.",
      cs: "40 krav na pastvě od jara do podzimu. Mléko plníme do lahví přímo na farmě každé ráno.",
      de: "40 Kühe auf der Weide von Frühling bis Herbst. Unsere Milch wird jeden Morgen auf dem Hof abgefüllt.",
      zh: "40 头奶牛从春到秋在牧场放养。我们的牛奶每天早上在农场装瓶。",
      zht: "40 頭乳牛從春到秋在牧場放牧。我們的牛奶每天早上在農場裝瓶。",
    },
  },
  {
    id: "artisan-bakery",
    name: "Artisan Bakery",
    owner: "Jana Horáková",
    distance: 7.2,
    angle: 300,
    cats: ["bakery"],
    organic: false,
    img: "img/bread.jpg",
    avatar: "img/farmer.jpg",
    phone: "+420 775 038 641",
    email: "bread@artisanbakery.example",
    instagram: "artisanbakery.village",
    about: {
      en: "Small village bakery baking sourdough bread from local flour, every night.",
      cs: "Malá vesnická pekárna, která každou noc peče kváskový chléb z místní mouky.",
      de: "Kleine Dorfbäckerei, die jede Nacht Sauerteigbrot aus regionalem Mehl backt.",
      zh: "一家小型乡村面包坊，每晚用本地面粉烘焙酸种面包。",
      zht: "一間小型鄉村麵包坊，每晚以在地麵粉烘焙酸種麵包。",
    },
  },
];

const PRODUCTS = [
  {
    id: "tomato",
    farm: "green-valley",
    cat: "veg",
    price: 4.99,
    unit: "kg",
    stock: 25,
    active: true,
    organic: true,
    featured: true,
    img: "img/tomato.jpg",
    name: { en: "Organic Tomatoes", cs: "Bio rajčata", de: "Bio-Tomaten", zh: "有机番茄", zht: "有機番茄" },
  },
  {
    id: "lettuce",
    farm: "sunny-acres",
    cat: "veg",
    price: 1.49,
    unit: "pcs",
    stock: 4,
    active: true,
    organic: false,
    featured: true,
    img: "img/lettuce.jpg",
    name: { en: "Fresh Lettuce", cs: "Čerstvý salát", de: "Frischer Salat", zh: "新鲜生菜", zht: "新鮮萵苣" },
  },
  {
    id: "milk",
    farm: "happy-cows",
    cat: "dairy",
    price: 1.89,
    unit: "l",
    stock: 30,
    active: true,
    organic: false,
    featured: true,
    img: "img/milk.jpg",
    name: { en: "Fresh Farm Milk", cs: "Čerstvé farmářské mléko", de: "Frische Hofmilch", zh: "新鲜农场牛奶", zht: "新鮮農場牛奶" },
  },
  {
    id: "strawberry",
    farm: "berry-best",
    cat: "fruit",
    price: 4.99,
    unit: "box",
    stock: 3,
    active: true,
    organic: true,
    featured: true,
    img: "img/strawberry.jpg",
    name: { en: "Organic Strawberries", cs: "Bio jahody", de: "Bio-Erdbeeren", zh: "有机草莓", zht: "有機草莓" },
  },
  {
    id: "carrots",
    farm: "root-harvest",
    cat: "veg",
    price: 2.49,
    unit: "kg",
    stock: 40,
    active: true,
    organic: false,
    img: "img/carrots.jpg",
    name: { en: "Rainbow Carrots", cs: "Barevná mrkev", de: "Bunte Karotten", zh: "彩虹胡萝卜", zht: "彩虹胡蘿蔔" },
  },
  {
    id: "potato",
    farm: "root-harvest",
    cat: "veg",
    price: 1.29,
    unit: "kg",
    stock: 60,
    active: true,
    organic: false,
    img: "img/potato.jpg",
    name: { en: "New Potatoes", cs: "Rané brambory", de: "Frühkartoffeln", zh: "新土豆", zht: "新馬鈴薯" },
  },
  {
    id: "bread",
    farm: "artisan-bakery",
    cat: "bakery",
    price: 3.99,
    unit: "loaf",
    stock: 8,
    active: true,
    organic: false,
    img: "img/bread.jpg",
    name: { en: "Sourdough Bread", cs: "Kváskový chléb", de: "Sauerteigbrot", zh: "酸种面包", zht: "酸種麵包" },
  },
  {
    id: "eggs",
    farm: "free-range",
    cat: "eggs",
    price: 3.49,
    unit: "pcs10",
    stock: 12,
    active: true,
    organic: true,
    img: "img/eggs.jpg",
    name: { en: "Free-Range Eggs", cs: "Vejce z volného výběhu", de: "Freilandeier", zh: "散养鸡蛋", zht: "放牧雞蛋" },
  },
  {
    id: "cucumber",
    farm: "green-valley",
    cat: "veg",
    price: 2.99,
    unit: "kg",
    stock: 18,
    active: true,
    organic: true,
    img: "img/cucumber.jpg",
    name: { en: "Fresh Cucumbers", cs: "Čerstvé okurky", de: "Frische Gurken", zh: "新鲜黄瓜", zht: "新鮮小黃瓜" },
  },
  {
    id: "corn",
    farm: "green-valley",
    cat: "veg",
    price: 0.89,
    unit: "pcs",
    stock: 0,
    active: true,
    organic: true,
    img: "img/corn.jpg",
    name: { en: "Sweet Corn", cs: "Cukrová kukuřice", de: "Zuckermais", zh: "甜玉米", zht: "甜玉米" },
  },
];

const CATEGORIES = [
  { id: "fruit", icon: "🍓" },
  { id: "veg", icon: "🥕" },
  { id: "dairy", icon: "🥛" },
  { id: "eggs", icon: "🥚" },
  { id: "bakery", icon: "🍞" },
];

const DELIVERY_FEE = 3.0;
const FREE_DELIVERY_FROM = 30.0;
const DELIVERY_WINDOWS = ["08:00–10:00", "12:00–14:00", "17:00–19:00"];

/* ───────────── demo accounts + persistent catalog ───────────── */
const DEMO_CUSTOMER = {
  name: "Anna Nováková",
  email: "anna@example.com",
  pw: "demo123",
  role: "customer",
  profile: { phone: "+420 777 123 456", address: "Dejvická 12", city: "Praha", zip: "160 00" },
};
const FARMER_PW = "farm123"; // every farm logs in with its e-mail + this password (demo only)

const BASE_PRODUCTS = JSON.parse(JSON.stringify(PRODUCTS));
const ORDER_STATUSES = ["new", "preparing", "shipping", "delivered"];

function loadCatalog() {
  const saved = FRStore.get("fr_catalog", null);
  if (Array.isArray(saved) && saved.length) PRODUCTS.splice(0, PRODUCTS.length, ...saved);
}
function saveCatalog() {
  FRStore.set("fr_catalog", PRODUCTS);
}

function isoDay(offset) {
  const d = new Date();
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function demoOrderLine(id, qty) {
  const p = BASE_PRODUCTS.find((x) => x.id === id);
  return { id, qty, price: p.price, name: p.name, farm: p.farm, unit: p.unit };
}

function seedOrders() {
  const mk = (id, daysAgo, slotOffset, win, lines, farmStatus) => {
    const sub = lines.reduce((a, l) => a + l.price * l.qty, 0);
    const fee = sub >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
    return {
      id,
      created: new Date(Date.now() - daysAgo * 86400000).toISOString(),
      lines,
      farms: [...new Set(lines.map((l) => l.farm))],
      farmStatus,
      subtotal: sub,
      fee,
      total: sub + fee,
      slot: { date: isoDay(slotOffset), win },
      pay: "card",
      userEmail: DEMO_CUSTOMER.email,
      customer: { name: DEMO_CUSTOMER.name, email: DEMO_CUSTOMER.email, phone: DEMO_CUSTOMER.profile.phone },
      address: DEMO_CUSTOMER.profile,
    };
  };
  return [
    mk("FR-100231", 6, -5, "17:00–19:00", [demoOrderLine("tomato", 2), demoOrderLine("cucumber", 1), demoOrderLine("milk", 2)], {
      "green-valley": "delivered",
      "happy-cows": "delivered",
    }),
    mk("FR-100245", 0, 1, "17:00–19:00", [demoOrderLine("tomato", 1), demoOrderLine("cucumber", 2), demoOrderLine("eggs", 1)], {
      "green-valley": "new",
      "free-range": "preparing",
    }),
  ];
}

function seedMessages() {
  return [
    {
      id: "m-1",
      farm: "green-valley",
      text: "Hello! Will you have zucchini next week? I would like 2 kg.",
      at: new Date(Date.now() - 2 * 86400000).toISOString(),
      from: DEMO_CUSTOMER.email,
      name: DEMO_CUSTOMER.name,
      replies: [],
    },
  ];
}

/** Creates demo accounts, orders and messages once (or again after a reset). */
function ensureDemoData(force) {
  if (!force && FRStore.get("fr_seeded", false)) return;
  const users = (FRStore.get("fr_users", []) || []).filter((u) => u.email !== DEMO_CUSTOMER.email);
  users.push(JSON.parse(JSON.stringify(DEMO_CUSTOMER)));
  FRStore.set("fr_users", users);
  const keepOrders = force ? [] : FRStore.get("fr_orders", []).filter((o) => !/^FR-1002/.test(o.id));
  FRStore.set("fr_orders", [...seedOrders(), ...keepOrders]);
  FRStore.set("fr_messages", seedMessages());
  if (force) {
    FRStore.remove("fr_catalog");
    PRODUCTS.splice(0, PRODUCTS.length, ...JSON.parse(JSON.stringify(BASE_PRODUCTS)));
    FRStore.set("fr_cart", {});
    FRStore.set("fr_follow", []);
  }
  FRStore.set("fr_seeded", true);
}

/** Look up a farmer account by e-mail. */
function farmerAccount(email) {
  const f = FARMS.find((x) => x.email.toLowerCase() === String(email).toLowerCase());
  return f ? { name: f.owner, email: f.email, role: "farmer", farm: f.id } : null;
}
