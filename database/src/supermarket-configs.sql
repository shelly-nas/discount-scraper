-- Seed Supermarket Configurations
-- This script populates the supermarket_configs table with initial data

-- Insert Albert Heijn configuration
INSERT INTO supermarket_configs (name, name_short, url, web_identifiers)
VALUES (
    'Albert Heijn',
    'ah',
    'https://www.ah.nl/bonus',
    '{
        "cookieDecline": "[data-testhook=\"accept-cookies\"]",
        "promotionExpireDate": "[data-testhook=\"period-toggle-button\"] > span",
        "productCategories": [
            "#groente-aardappelen",
            "#fruit-verse-sappen",
            "#maaltijden-salades",
            "#vegetarisch-vegan-en-plantaardig",
            "#vlees",
            "#vleeswaren",
            "#vis",
            "#kaas",
            "#zuivel-eieren",
            "#bakkerij",
            "#glutenvrij",
            "#borrel-chips-snacks",
            "#pasta-rijst-wereldkeuken",
            "#soepen-sauzen-kruiden-olie",
            "#koek-snoep-chocolade",
            "#ontbijtgranen-beleg",
            "#koffie-thee",
            "#frisdrank-sappen-water",
            "#bier-wijn-aperitieven",
            "#diepvries",
            "#drogisterij",
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
            "section:has(h2:has-text(\"Aardappelen, groente & fruit\"))",
            "section:has(h2:has-text(\"Vlees, vis & vega\"))",
            "section:has(h2:has-text(\"Zuivel & kaas\"))",
            "section:has(h2:has-text(\"Dranken, sap, koffie & thee\"))",
            "section:has(h2:has-text(\"Voorraadkast\"))",
            "section:has(h2:has-text(\"Maaltijden, salades & tapas\"))",
            "section:has(h2:has-text(\"Diepvries\"))",
            "section:has(h2:has-text(\"Kind & drogisterij\"))",
            "section:has(h2:has-text(\"Huishoud & huisdieren\"))",
            "section:has(h2:has-text(\"Snacks & snoep\"))"
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
        "cookieDecline": ".btn-cookies-accept",
        "promotionExpireDate": ".promo-period-display",
        "productCategories": [
            "div.ThemeGrid_Container:has(h2:has-text(\"Aardappelen, groente, fruit\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Verse kant-en-klaarmaaltijden\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Vlees, kip, vis, vega\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Kaas, vleeswaren, tapas\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Zuivel, eieren, boter\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Brood, gebak, bakproducten\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Ontbijtgranen, broodbeleg, tussendoor\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Frisdrank, sappen, koffie, thee\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Wijn, bier, sterke drank\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Pasta, rijst, internationale keuken\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Soepen, conserven, sauzen, smaakmakers\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Snoep, koek, chocolade, chips, noten\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Diepvries\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Baby, drogisterij\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Huishouden\"))",
            "div.ThemeGrid_Container:has(h2:has-text(\"Huisdier\"))"
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
