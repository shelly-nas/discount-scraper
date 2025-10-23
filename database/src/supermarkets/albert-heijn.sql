-- Albert Heijn Supermarket Configuration

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
