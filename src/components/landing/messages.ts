import { defineMessages } from "@/i18n/messages";

/** Every word on the landing page, in English and Arabic. */
export const landingMessages = defineMessages({
  en: {
    nav: {
      marketplaces: "Marketplaces",
      platform: "Platform",
      pricing: "Pricing",
      faq: "FAQ",
      signIn: "Sign in",
      createAccount: "Create a free account",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      farmers: { label: "Farmers → Factories", body: "Sell crop residues straight to factories" },
      factories: { label: "Factories → Factories", body: "Trade by-products between plants" },
      quality: { label: "Quality score", body: "A 0–100 score on every batch" },
      how: { label: "How it works", body: "From listing to sale in three steps" },
      routes: { label: "Routes A · B · C", body: "Pharma, food-grade or recovery" },
    },
    hero: {
      title: "Your waste is someone's raw material",
      body: "BioGrena connects farms and factories that throw away peels, pomace and residues with the factories that need them — every batch scored.",
      cta: "Start now",
      imageAlt: "A monarch butterfly resting on a moss-covered branch",
    },
    residues: {
      label: "Traded on BioGrena",
      items: [
        "Pomegranate peels",
        "Citrus peels",
        "Olive pomace",
        "Tomato skins & seeds",
        "Grape marc",
        "Date pits",
        "Corn silk",
      ],
    },
    markets: {
      eyebrow: "Two marketplaces",
      title: "Two markets, one circular harvest",
      body: "Whether you grow it or process it, what you throw away has a buyer, and every batch is scored.",
      farmLabel: "Farmers → Factories",
      factoryLabel: "Factories → Factories",
      farm: [
        {
          title: "Sell crop residues",
          body: "Peels, husks and pulp you used to burn or dump now have buyers among extract, food and feed factories.",
        },
        {
          title: "Fair prices, no middlemen",
          body: "Deal with the factory directly. Listing is free, and a better score earns a better price.",
        },
        {
          title: "Pickup at the farm",
          body: "Agree on quantity and date, and the buyer collects straight from your field or cooperative.",
        },
      ],
      factory: [
        {
          title: "Sell your by-products",
          body: "Juice, canning and olive-oil plants turn pomace, skins and seeds into steady weekly income.",
        },
        {
          title: "Find raw material",
          body: "Extract, pectin, bio-packaging and energy makers source what they need, close to home.",
        },
        {
          title: "Every batch scored",
          body: "Each listing carries a 0–100 quality score and an A, B or C route, so buyers know what they get.",
        },
      ],
      globeAlt: "A globe of moss and bark circled by a green ring",
      cta: "Explore the marketplace",
    },
    quality: {
      eyebrow: "Quality you can trust",
      title: "Every batch is scored before it is sold.",
      body: "Lab readings go in, and a crop-specific model returns a 0–100 score with the reasons next to it. Sellers get paid for quality; buyers know what they are buying.",
      tools: [
        {
          title: "Audit trail",
          body: "Inspectors can override a route, but only with a reason. Every change is signed and time-stamped.",
        },
        {
          title: "Quality certificates",
          body: "A clean PDF per batch or per month that travels with the sale to buyers and auditors.",
        },
        {
          title: "AI assistant",
          body: "Ask about your data in plain words: which supplier improved, which season scored best.",
        },
        {
          title: "Team workspaces",
          body: "Each company gets its own workspace for receiving staff, lab technicians and inspectors.",
        },
      ],
      card: {
        shipment: "Shipment #2481 · Pomegranate peels",
        scored: "scored",
        scoreLabel: "quality score out of 100",
        route: "Route",
        routeValue: "A · Pharma",
        readings: ["Polyphenols", "Moisture", "Contamination"],
        pts: "pts",
        signed: "Signed · inspector",
        example: "Example batch",
      },
    },
    how: {
      eyebrow: "How it works",
      title: "From waste to sale in three steps.",
      body: "In three simple steps, BioGrena turns crop and factory waste into a raw material someone buys.",
      cta: "List your waste",
      steps: [
        {
          title: "List it",
          body: "A farmer or factory adds the residue, quantity, location and photos from a phone. A partner lab can add the readings.",
          alt: "The BioGrena app on a phone, listing a residue",
        },
        {
          title: "Get scored",
          body: "BioGrena scores the batch 0–100 and gives it a route: A pharmaceutical, B food-grade or C recovery. Better score, better price.",
          alt: "A batch score of 86 out of 100 with its three routes",
        },
        {
          title: "Sell it",
          body: "Factories find the listing, make an offer and arrange pickup. The quality certificate travels with the batch.",
          alt: "A quality certificate for a batch, resting on moss",
        },
      ],
    },
    routes: {
      eyebrow: "Routes",
      title: "Every batch finds its highest-value use",
      body: "The score decides the route. The best batches go to medicines, good ones to food, and the rest to compost and energy, so nothing grown is thrown away.",
      checks: [
        "Route A, 80–100: pharmaceutical extracts and medicines",
        "Route B, 50–79: colourants, fibres and supplements",
        "Route C, 0–49: compost and energy",
        "Inspectors can override a route, with a logged reason",
      ],
      cta: "See how scoring works",
      imageAlt: "The BioGrena dashboard on a laptop resting on a mossy branch",
      facts: ["Route A · Pharmaceutical", "Route B · Food-grade", "Route C · Recovery", "Quality score per batch"],
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Free to list. Pay when you sell.",
      draft: "Draft pricing, to be confirmed.",
      plans: [
        {
          name: "Farmers",
          lead: "Sell your crop residues.",
          price: "Free",
          unit: "no subscription",
          features: ["Unlimited listings", "Quality score on every batch", "Offers from factories"],
          cta: "List my waste",
        },
        {
          name: "Marketplace",
          lead: "For every sale on BioGrena.",
          price: "5%",
          unit: "per sale",
          features: ["Paid only when a deal closes", "Buy from farmers and factories", "Quality certificate per batch"],
          cta: "Start buying",
        },
        {
          name: "Factory Pro",
          lead: "For factories that grade every week.",
          price: "Custom",
          unit: "monthly plan",
          features: [
            "Your own scoring and inspectors",
            "Supplier and season analytics",
            "AI assistant and monthly reports",
          ],
          cta: "Talk to us",
        },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Questions, answered.",
      items: [
        {
          q: "Who can sell on BioGrena?",
          a: "Farmers, cooperatives and factories. Farmers sell crop residues like peels and husks; factories sell by-products like pomace. Pomegranate peels are scored today, and more crops are added one by one.",
        },
        {
          q: "How is the quality score calculated?",
          a: "Each batch's lab readings (moisture, polyphenols, contamination) are compared against crop-specific thresholds and combined into a 0 to 100 score. The reasons are shown next to the score.",
        },
        {
          q: "Can an inspector disagree with the route?",
          a: "Yes. Inspectors can override any route, but they must give a reason. Every override is signed and time-stamped in the audit trail.",
        },
        {
          q: "How do buyer and seller close a deal?",
          a: "The buyer makes an offer on a listing, the seller accepts, and both agree on pickup. BioGrena takes a small commission only when the sale is done.",
        },
        {
          q: "Where is our data stored?",
          a: "In an encrypted cloud database. Each company's data stays in its own workspace and is never shared with other companies.",
        },
      ],
    },
    closing: {
      title: "Nothing grown should be wasted",
      body: "List your waste for free, or find your next raw material.",
      cta: "Create a free account",
      guest: "Preview as guest",
    },
    footer: {
      tagline: "The bio-waste marketplace for farmers and factories.",
      product: "Product",
      account: "Account",
      help: "Help",
      marketplaces: "Marketplaces",
      quality: "Quality score",
      how: "How it works",
      pricing: "Pricing",
      signIn: "Sign in",
      createAccount: "Create account",
      guest: "Preview as guest",
      faq: "FAQ",
      routes: "Routes",
      rights: "© 2026 BioGrena. All rights reserved.",
      madeFor: "Made for the Mediterranean harvest.",
    },
  },
  ar: {
    nav: {
      marketplaces: "الأسواق",
      platform: "المنصة",
      pricing: "الأسعار",
      faq: "الأسئلة الشائعة",
      signIn: "تسجيل الدخول",
      createAccount: "أنشئ حسابًا مجانيًا",
      openMenu: "فتح القائمة",
      closeMenu: "إغلاق القائمة",
      farmers: { label: "من المزارع إلى المصانع", body: "بِع مخلفات محاصيلك للمصانع مباشرة" },
      factories: { label: "من مصنع إلى مصنع", body: "تبادل المنتجات الثانوية بين المصانع" },
      quality: { label: "تقييم الجودة", body: "تقييم من 0 إلى 100 لكل دفعة" },
      how: { label: "كيف تعمل", body: "من الإدراج إلى البيع في ثلاث خطوات" },
      routes: { label: "المسارات A · B · C", body: "صيدلاني أو غذائي أو استرجاع" },
    },
    hero: {
      title: "مخلفاتك مادة خام لغيرك",
      body: "تربط BioGrena المزارع والمصانع التي تتخلص من القشور والتفل والمخلفات بالمصانع التي تحتاجها، مع تقييم كل دفعة.",
      cta: "ابدأ الآن",
      imageAlt: "فراشة ملكية تستريح على غصن مكسو بالطحالب",
    },
    residues: {
      label: "يُتداول على BioGrena",
      items: [
        "قشور الرمان",
        "قشور الحمضيات",
        "تفل الزيتون",
        "قشور وبذور الطماطم",
        "تفل العنب",
        "نوى التمر",
        "حرير الذرة",
      ],
    },
    markets: {
      eyebrow: "سوقان",
      title: "سوقان وحصاد دائري واحد",
      body: "سواء كنت تزرع أو تصنّع، فما تتخلص منه له مشترٍ، وكل دفعة تحصل على تقييم.",
      farmLabel: "من المزارع إلى المصانع",
      factoryLabel: "من مصنع إلى مصنع",
      farm: [
        {
          title: "بِع مخلفات محاصيلك",
          body: "القشور والأغلفة واللب التي كنت تحرقها أو ترميها أصبح لها مشترون من مصانع المستخلصات والأغذية والأعلاف.",
        },
        {
          title: "أسعار عادلة بلا وسطاء",
          body: "تعامل مع المصنع مباشرة. الإدراج مجاني، والتقييم الأعلى يعني سعرًا أفضل.",
        },
        {
          title: "الاستلام من المزرعة",
          body: "اتفق على الكمية والموعد، ويستلم المشتري مباشرة من حقلك أو تعاونيتك.",
        },
      ],
      factory: [
        {
          title: "بِع منتجاتك الثانوية",
          body: "تحوّل مصانع العصير والتعليب وزيت الزيتون التفل والقشور والبذور إلى دخل أسبوعي ثابت.",
        },
        {
          title: "اعثر على المادة الخام",
          body: "يجد صانعو المستخلصات والبكتين والتغليف الحيوي والطاقة ما يحتاجونه بالقرب منهم.",
        },
        {
          title: "كل دفعة مُقيّمة",
          body: "كل إدراج يحمل تقييم جودة من 0 إلى 100 ومسارًا A أو B أو C، فيعرف المشتري ما يشتريه.",
        },
      ],
      globeAlt: "كرة من الطحالب واللحاء تحيط بها حلقة خضراء",
      cta: "استكشف السوق",
    },
    quality: {
      eyebrow: "جودة تستحق الثقة",
      title: "كل دفعة تُقيَّم قبل بيعها.",
      body: "تدخل نتائج المختبر، فيُرجع نموذج خاص بكل محصول تقييمًا من 0 إلى 100 مع أسبابه. البائع يُكافأ على الجودة، والمشتري يعرف ما يشتريه.",
      tools: [
        {
          title: "سجل التدقيق",
          body: "يمكن للمفتش تغيير المسار، لكن بسبب مكتوب فقط. كل تغيير موقّع ومؤرّخ.",
        },
        {
          title: "شهادات الجودة",
          body: "ملف PDF واضح لكل دفعة أو لكل شهر يرافق عملية البيع إلى المشترين والمدققين.",
        },
        {
          title: "مساعد ذكي",
          body: "اسأل عن بياناتك بكلمات بسيطة: أي مورّد تحسّن، وأي موسم حصل على أفضل تقييم.",
        },
        {
          title: "مساحات عمل للفرق",
          body: "لكل شركة مساحة عمل خاصة بها لموظفي الاستلام وفنيي المختبر والمفتشين.",
        },
      ],
      card: {
        shipment: "الشحنة ‎#2481 · قشور الرمان",
        scored: "مُقيّمة",
        scoreLabel: "تقييم الجودة من 100",
        route: "المسار",
        routeValue: "A · صيدلاني",
        readings: ["البوليفينول", "الرطوبة", "التلوث"],
        pts: "نقطة",
        signed: "موقّعة · المفتش",
        example: "دفعة للتوضيح",
      },
    },
    how: {
      eyebrow: "كيف تعمل",
      title: "من المخلفات إلى البيع في ثلاث خطوات.",
      body: "في ثلاث خطوات بسيطة، تحوّل BioGrena مخلفات المزارع والمصانع إلى مادة خام يشتريها غيرك.",
      cta: "أدرج مخلفاتك",
      steps: [
        {
          title: "أدرجها",
          body: "يضيف المزارع أو المصنع نوع المخلفات والكمية والموقع والصور من الهاتف. ويمكن لمختبر شريك إضافة النتائج.",
          alt: "تطبيق BioGrena على هاتف أثناء إدراج مخلفات",
        },
        {
          title: "احصل على التقييم",
          body: "تقيّم BioGrena الدفعة من 0 إلى 100 وتحدد مسارها: A صيدلاني أو B غذائي أو C استرجاع. تقييم أعلى، سعر أفضل.",
          alt: "تقييم دفعة 86 من 100 مع مساراتها الثلاثة",
        },
        {
          title: "بِعها",
          body: "تجد المصانع الإدراج، وتقدّم عرضًا وتنسّق الاستلام. وترافق شهادة الجودة الدفعة.",
          alt: "شهادة جودة لدفعة موضوعة على الطحالب",
        },
      ],
    },
    routes: {
      eyebrow: "المسارات",
      title: "كل دفعة تجد استخدامها الأعلى قيمة",
      body: "التقييم يحدد المسار. أفضل الدفعات تذهب إلى الأدوية، والجيدة إلى الغذاء، والباقي إلى السماد والطاقة، فلا يُهدر شيء مما نزرعه.",
      checks: [
        "المسار A، من 80 إلى 100: مستخلصات صيدلانية وأدوية",
        "المسار B، من 50 إلى 79: ملوّنات وألياف ومكمّلات",
        "المسار C، من 0 إلى 49: سماد وطاقة",
        "يمكن للمفتش تغيير المسار، مع تسجيل السبب",
      ],
      cta: "اكتشف كيف يعمل التقييم",
      imageAlt: "لوحة تحكم BioGrena على حاسوب محمول فوق غصن مكسو بالطحالب",
      facts: ["المسار A · صيدلاني", "المسار B · غذائي", "المسار C · استرجاع", "تقييم الجودة لكل دفعة"],
    },
    pricing: {
      eyebrow: "الأسعار",
      title: "الإدراج مجاني. تدفع عندما تبيع.",
      draft: "أسعار مبدئية، قيد التأكيد.",
      plans: [
        {
          name: "المزارعون",
          lead: "بِع مخلفات محاصيلك.",
          price: "مجانًا",
          unit: "بلا اشتراك",
          features: ["إدراجات غير محدودة", "تقييم جودة لكل دفعة", "عروض من المصانع"],
          cta: "أدرج مخلفاتي",
        },
        {
          name: "السوق",
          lead: "لكل عملية بيع على BioGrena.",
          price: "5%",
          unit: "لكل عملية بيع",
          features: ["تُدفع فقط عند إتمام الصفقة", "اشترِ من المزارعين والمصانع", "شهادة جودة لكل دفعة"],
          cta: "ابدأ الشراء",
        },
        {
          name: "Factory Pro",
          lead: "للمصانع التي تقيّم كل أسبوع.",
          price: "حسب الطلب",
          unit: "اشتراك شهري",
          features: ["تقييمك ومفتشوك الخاصون", "تحليلات للموردين والمواسم", "مساعد ذكي وتقارير شهرية"],
          cta: "تواصل معنا",
        },
      ],
    },
    faq: {
      eyebrow: "الأسئلة الشائعة",
      title: "أسئلة وأجوبة.",
      items: [
        {
          q: "من يمكنه البيع على BioGrena؟",
          a: "المزارعون والتعاونيات والمصانع. يبيع المزارعون مخلفات المحاصيل مثل القشور والأغلفة، وتبيع المصانع المنتجات الثانوية مثل التفل. قشور الرمان تُقيَّم اليوم، وتُضاف محاصيل أخرى تباعًا.",
        },
        {
          q: "كيف يُحسب تقييم الجودة؟",
          a: "تُقارن نتائج المختبر لكل دفعة (الرطوبة والبوليفينول والتلوث) بحدود خاصة بكل محصول، وتُجمع في تقييم من 0 إلى 100. وتظهر الأسباب بجانب التقييم.",
        },
        {
          q: "هل يمكن للمفتش أن يخالف المسار؟",
          a: "نعم. يمكن للمفتش تغيير أي مسار، لكن عليه ذكر السبب. وكل تغيير موقّع ومؤرّخ في سجل التدقيق.",
        },
        {
          q: "كيف يُتم البائع والمشتري الصفقة؟",
          a: "يقدّم المشتري عرضًا على الإدراج، ويقبله البائع، ويتفقان على الاستلام. وتأخذ BioGrena عمولة صغيرة فقط عند إتمام البيع.",
        },
        {
          q: "أين تُخزَّن بياناتنا؟",
          a: "في قاعدة بيانات سحابية مشفّرة. تبقى بيانات كل شركة في مساحة عملها الخاصة ولا تُشارك أبدًا مع شركات أخرى.",
        },
      ],
    },
    closing: {
      title: "لا شيء مما نزرعه يجب أن يُهدر",
      body: "أدرج مخلفاتك مجانًا، أو اعثر على مادتك الخام القادمة.",
      cta: "أنشئ حسابًا مجانيًا",
      guest: "جرّب كزائر",
    },
    footer: {
      tagline: "سوق المخلفات الحيوية للمزارعين والمصانع.",
      product: "المنتج",
      account: "الحساب",
      help: "المساعدة",
      marketplaces: "الأسواق",
      quality: "تقييم الجودة",
      how: "كيف تعمل",
      pricing: "الأسعار",
      signIn: "تسجيل الدخول",
      createAccount: "إنشاء حساب",
      guest: "جرّب كزائر",
      faq: "الأسئلة الشائعة",
      routes: "المسارات",
      rights: "© 2026 BioGrena. جميع الحقوق محفوظة.",
      madeFor: "صُنعت لحصاد البحر المتوسط.",
    },
  },
});

export type LandingMessages = (typeof landingMessages)["en"];
