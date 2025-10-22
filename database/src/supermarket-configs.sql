-- Seed Supermarket Configurations
-- This script populates the supermarket_configs table with initial data
-- from the config/supermarkets JSON files

-- Insert Albert Heijn configuration
INSERT INTO supermarket_configs (name, name_short, url, web_identifiers)
VALUES (
    'Albert Heijn',
    'ah',
    'https://www.ah.nl/bonus',
    '{
        "cookieDecline": "#decline-cookies",
        "promotionExpireDate": "#period-toggle-button > span",
        "productCategories": [
            "#groente-aardappelen",
            "#fruit-verse-sappen",
            "#maaltijden-salades",
            "#vlees",
            "#vis",
            "#vegetarisch-vegan-en-plantaardig",
            "#vleeswaren",
            "#kaas",
            "#zuivel-eieren",
            "#bakkerij",
            "#borrel-chips-snacks",
            "#pasta-rijst-wereldkeuken",
            "#snoep-chocolade-koek",
            "#ontbijtgranen-beleg",
            "#tussendoortjes",
            "#diepvries",
            "#koffie-thee",
            "#frisdrank-sappen-water",
            "#bier-wijn-aperitieven",
            "#drogisterij",
            "#gezondheid-en-sport",
            "#huishouden",
            "#baby-en-kind",
            "#huisdier",
            "#koken-tafelen-vrije-tijd"
        ],
        "products": "a[id]",
        "promotionProducts": {
            "productCategory": ["h3"],
            "productName": ["[data-testhook=\"promotion-card-title\"]"],
            "originalPrice": [".promotion-price_root__UAFIC", "data-testpricewas"],
            "discountPrice": [".promotion-price_root__UAFIC", "data-testpricenow"],
            "specialDiscount": ["[data-testhook=\"promotion-text\"]"]
        }
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE
SET 
    name_short = EXCLUDED.name_short,
    url = EXCLUDED.url,
    web_identifiers = EXCLUDED.web_identifiers,
    updated_at = CURRENT_TIMESTAMP;

-- Insert Dirk configuration
INSERT INTO supermarket_configs (name, name_short, url, web_identifiers)
VALUES (
    'Dirk',
    'dirk',
    'https://www.dirk.nl/aanbiedingen',
    '{
        "cookieDecline": null,
        "promotionExpireDate": "#__nuxt > div > main > div.base-page > div:nth-child(2) > div > div > div.header-container.offers-header > div.header.mobile-margin > button.animate.calender-button.current > span.date",
        "productCategories": [
            "Aardappelen, groente & fruit",
            "Vlees, vis & vega",
            "Zuivel & kaas",
            "Dranken, sap, koffie & thee",
            "Voorraadkast",
            "Maaltijden, salades & tapas",
            "Diepvries",
            "Kind & drogisterij",
            "Huishoud & huisdieren",
            "Snacks & snoep"
        ],
        "products": "article",
        "promotionProducts": {
            "productCategory": ["h2"],
            "productName": [".title"],
            "originalPrice": ["div.label.price-label .regular-price", "span"],
            "discountPrice": [
                ".hasEuros.price-large",
                ".price-small",
                ".price-large:not(.hasEuros)"
            ],
            "specialDiscount": [".subtitle"]
        }
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE
SET 
    name_short = EXCLUDED.name_short,
    url = EXCLUDED.url,
    web_identifiers = EXCLUDED.web_identifiers,
    updated_at = CURRENT_TIMESTAMP;

-- Insert PLUS configuration
INSERT INTO supermarket_configs (name, name_short, url, web_identifiers)
VALUES (
    'PLUS',
    'plus',
    'https://www.plus.nl/aanbiedingen',
    '{
        "cookieDecline": "#b1-b36-b1-FooterRightButtom > button.btn.btn-primary.btn-cookies-accept.gtm-cookies-popup-accept-all-btn.ThemeGrid_MarginGutter",
        "promotionExpireDate": "#b7-$b2 > span",
        "productCategories": [
            "Aardappelen, groente, fruit",
            "Verse kant-en-klaarmaaltijden",
            "Vlees, kip, vis, vega",
            "Kaas, vleeswaren, tapas",
            "Zuivel, eieren, boter",
            "Brood, gebak, bakproducten",
            "Ontbijtgranen, broodbeleg, tussendoor",
            "Frisdrank, sappen, koffie, thee",
            "Wijn, bier, sterke drank",
            "Pasta, rijst, internationale keuken",
            "Soepen, conserven, sauzen, smaakmakers",
            "Snoep, koek, chocolade, chips, noten",
            "Diepvries",
            "Baby, drogisterij",
            "Huishouden",
            "Huisdier"
        ],
        "products": "a[data-link]",
        "promotionProducts": {
            "productCategory": ["span[data-expression]"],
            "productName": [
                ".ph.plp-item-name .multiline-truncation-text span[data-expression]"
            ],
            "originalPrice": ["div.ph.product-header-price-previous span"],
            "discountPrice": [
                ".font-bold.product-header-price-integer span",
                ".font-black.product-header-price-decimals span"
            ],
            "specialDiscount": [
                "div.ph.promo-offer-label div.multiline-truncation-text span"
            ]
        }
    }'::jsonb
)
ON CONFLICT (name) DO UPDATE
SET 
    name_short = EXCLUDED.name_short,
    url = EXCLUDED.url,
    web_identifiers = EXCLUDED.web_identifiers,
    updated_at = CURRENT_TIMESTAMP;

-- Verify insertions
SELECT id, name, name_short, url, created_at, updated_at
FROM supermarket_configs
ORDER BY name;

-- Show total count
SELECT COUNT(*) as total_supermarkets FROM supermarket_configs;
